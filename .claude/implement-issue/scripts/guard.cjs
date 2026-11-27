#!/usr/bin/env node
// PreToolUse hook for Bash/PowerShell. Blocks what docs/workflow.md forbids agents to do:
// pushing to main/master, force-pushing, deleting remote branches, merging PRs, and adding the
// owner-only labels (ready-for-dev, skip-issue-check, design-approved).
// Exit 2 + stderr blocks the call. This is defense in depth on top of permissions.deny and
// branch protection, not a sandbox: it parses common command shapes, not every possible one.
// It only sees commands run through the Bash/PowerShell tools; the pipeline's own scripts
// (open-pr.cjs) enforce the same rules for the git calls they make internally.
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

const PROTECTED = new Set(['main', 'master']);
const SEPARATORS = new Set(['&&', '||', ';', '|', '&', '|&', '\n']);
// Characters a backslash escapes in bash. Any other backslash is kept literally, so Windows
// paths like "C:\Program Files\GitHub CLI\gh.exe" survive.
const UNQUOTED_ESCAPES = new Set([' ', '"', "'", '\\', '$', '`', ';', '&', '|', '(', ')', '<', '>', '\t']);
const DQUOTE_ESCAPES = new Set(['$', '`', '"', '\\', '\n']);

// Split a shell command into tokens, keeping separators as their own tokens.
function tokenize(cmd) {
  const tokens = [];
  let cur = '';
  let has = false;
  const push = () => { if (has) tokens.push(cur); cur = ''; has = false; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (c === "'") {
      const j = cmd.indexOf("'", i + 1);
      const end = j === -1 ? cmd.length : j;
      cur += cmd.slice(i + 1, end); has = true; i = end;
    } else if (c === '"') {
      i++;
      while (i < cmd.length && cmd[i] !== '"') {
        if (cmd[i] === '\\' && DQUOTE_ESCAPES.has(cmd[i + 1])) { cur += cmd[i + 1]; i += 2; } else { cur += cmd[i]; i++; }
      }
      has = true;
    } else if (c === '\\' && UNQUOTED_ESCAPES.has(cmd[i + 1])) {
      cur += cmd[i + 1]; has = true; i++;
    } else if (c === '\\' && cmd[i + 1] === '\n') {
      i++;
    } else if (c === '\n' || c === ';') {
      push(); tokens.push(c === '\n' ? '\n' : ';');
    } else if (c === '&' || c === '|') {
      push();
      const two = cmd.slice(i, i + 2);
      if (two === '&&' || two === '||' || two === '|&') { tokens.push(two); i++; } else tokens.push(c);
    } else if (/\s/.test(c)) {
      push();
    } else { cur += c; has = true; }
  }
  push();
  return tokens;
}

function segments(tokens) {
  const segs = [[]];
  for (const t of tokens) {
    if (SEPARATORS.has(t)) segs.push([]); else segs[segs.length - 1].push(t);
  }
  return segs.filter((s) => s.length);
}

// Commands nested in $(...), backticks, or `bash -c "..."` are checked too.
function nestedCommands(cmd, segs) {
  const nested = [];
  for (const m of cmd.matchAll(/\$\(([^()]*)\)/g)) nested.push(m[1]);
  for (const m of cmd.matchAll(/`([^`]*)`/g)) nested.push(m[1]);
  for (const s of segs) {
    const prog = base(s[0]);
    if (['bash', 'sh', 'zsh'].includes(prog)) {
      const i = s.indexOf('-c'); if (i !== -1 && s[i + 1]) nested.push(s[i + 1]);
    }
    if (['pwsh', 'powershell'].includes(prog)) {
      const i = s.findIndex((t) => /^-c(ommand)?$/i.test(t)); if (i !== -1 && s[i + 1]) nested.push(s.slice(i + 1).join(' '));
    }
  }
  return nested;
}

function base(tok) {
  return path.posix.basename(String(tok || '').replace(/\\/g, '/')).replace(/\.exe$/i, '').toLowerCase();
}

// Git Bash paths (/c/Users/...) to Windows paths (C:/Users/...).
function toNativePath(p) {
  if (process.platform === 'win32') return String(p).replace(/^\/([a-zA-Z])(?=\/|$)/, (m, d) => `${d.toUpperCase()}:`);
  return String(p);
}

function resolveDir(from, to) {
  return path.resolve(toNativePath(from), toNativePath(to));
}

// Drop leading VAR=value assignments and wrappers like `command`, `exec`, `sudo`, PowerShell's `&`.
function stripPrefix(seg) {
  let i = 0;
  while (i < seg.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(seg[i]) || ['command', 'exec', 'sudo', '&', 'env'].includes(seg[i]))) i++;
  return seg.slice(i);
}

const isDynamic = (t) => /[$`(]/.test(t);
const GIT_OPTS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);
const PUSH_OPTS_WITH_VALUE = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec', '--signed']);

function checkGitPush(args, branch) {
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { positional.push(...args.slice(i + 1)); break; }
    if (a.startsWith('-')) {
      if (/^(-f|--force|--force-with-lease.*|--force-if-includes|--mirror|--all|--branches|--prune|--delete|-d)$/.test(a)
        || (/^-[a-zA-Z]+$/.test(a) && /[fd]/.test(a.slice(1)))) {
        return `\`git push ${a}\` is not allowed (no force-push, mirror/all pushes, or remote branch deletion).`;
      }
      if (PUSH_OPTS_WITH_VALUE.has(a)) i++;
      continue;
    }
    positional.push(a);
  }
  const refspecs = positional.slice(1);
  const onProtected = (why) => {
    if (branch === null) return `${why} could not be checked (unknown current branch), so it is blocked. Push an explicit branch name.`;
    if (PROTECTED.has(branch)) return `${why} from \`${branch}\` is not allowed. Work on a branch and open a PR.`;
    return null;
  };
  if (refspecs.length === 0) return onProtected('`git push`');
  for (const r of refspecs) {
    if (isDynamic(r)) { const why = onProtected(`\`git push ${r}\``); if (why) return why; continue; }
    if (r.startsWith('+')) return `Force-push refspec \`${r}\` is not allowed.`;
    if (r.startsWith(':')) return `Deleting a remote branch (\`${r}\`) is not allowed.`;
    const dst = (r.includes(':') ? r.split(':').pop() : r).replace(/^refs\/heads\//, '');
    if (PROTECTED.has(dst)) return `Pushing to \`${dst}\` is not allowed. Open a PR instead.`;
    if (dst === 'HEAD' && !r.includes(':')) { const why = onProtected(`\`git push ${r}\``); if (why) return why; }
  }
  return null;
}

function labelValues(args, flags) {
  const vals = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    for (const f of flags) {
      if (a === f && args[i + 1] !== undefined) vals.push(args[i + 1]);
      else if (a.startsWith(f + '=')) vals.push(a.slice(f.length + 1));
    }
  }
  return vals.flatMap((v) => v.split(',')).map((v) => v.trim().toLowerCase()).filter(Boolean);
}

function checkGh(args, ownerOnly) {
  const [group, sub] = args;
  if (group === 'pr' && sub === 'merge') return '`gh pr merge` is not allowed. Only the owner merges PRs.';
  if (group === 'api') {
    if (args.some((a) => /\/merge\b/.test(a))) return 'Merging through `gh api` is not allowed.';
    const isDelete = args.some((a, i) => (/^(-X|--method)$/.test(a) && /^delete$/i.test(args[i + 1] || '')) || /^--method=delete$/i.test(a) || /^-XDELETE$/i.test(a));
    const text = args.join(' ').toLowerCase();
    if (!isDelete && /labels/.test(text)) {
      const bad = ownerOnly.find((l) => text.includes(l));
      if (bad) return `Adding the owner-only label \`${bad}\` is not allowed.`;
    }
  }
  if ((group === 'issue' || group === 'pr') && ['edit', 'create'].includes(sub)) {
    const flags = sub === 'edit' ? ['--add-label'] : ['--label', '-l'];
    const bad = labelValues(args.slice(2), flags).find((l) => ownerOnly.includes(l));
    if (bad) return `Adding the owner-only label \`${bad}\` is not allowed. Only the owner adds it.`;
  }
  return null;
}

// Catches gh calls whatever the program token looks like ("$GH", a full path, an alias).
function checkAnyProgram(seg, ownerOnly) {
  for (let i = 0; i < seg.length - 1; i++) {
    if (seg[i] === 'pr' && seg[i + 1] === 'merge') return 'Merging a PR (`pr merge`) is not allowed. Only the owner merges PRs.';
  }
  const addIdx = seg.findIndex((t) => t === '--add-label' || t.startsWith('--add-label='));
  if (addIdx !== -1) {
    const bad = labelValues(seg, ['--add-label']).find((l) => ownerOnly.includes(l));
    if (bad) return `Adding the owner-only label \`${bad}\` is not allowed.`;
  }
  return null;
}

// opts: { cwd, branchOf(dir) -> branch|null, ownerOnlyLabels: string[] }
function checkCommand(cmd, opts = {}) {
  const ownerOnly = (opts.ownerOnlyLabels || ['ready-for-dev', 'skip-issue-check', 'design-approved']).map((l) => l.toLowerCase());
  const branchOf = opts.branchOf || (() => null);
  let cwd = opts.cwd || process.cwd();
  const segs = segments(tokenize(String(cmd || '')));

  for (const raw of segs) {
    const seg = stripPrefix(raw);
    if (!seg.length) continue;
    const prog = base(seg[0]);
    if (prog === 'cd' || prog === 'set-location' || prog === 'pushd' || prog === 'sl') {
      const target = seg.slice(1).find((t) => !/^-(path|literalpath)$/i.test(t) && !t.startsWith('-'));
      if (target) cwd = resolveDir(cwd, target);
      continue;
    }
    const any = checkAnyProgram(seg, ownerOnly);
    if (any) return { blocked: true, reason: any };
    const gitLike = prog === 'git' || (seg[0].startsWith('$') && seg.includes('push'));
    if (gitLike) {
      let i = 1;
      let dir = cwd;
      while (i < seg.length && seg[i].startsWith('-')) {
        const o = seg[i].split('=')[0];
        if (seg[i] === '-C' && seg[i + 1]) dir = resolveDir(dir, seg[i + 1]);
        i += GIT_OPTS_WITH_VALUE.has(o) && !seg[i].includes('=') ? 2 : 1;
      }
      if (seg[i] === 'push') {
        const reason = checkGitPush(seg.slice(i + 1), branchOf(dir));
        if (reason) return { blocked: true, reason };
      }
    }
    if (prog === 'gh') {
      const reason = checkGh(seg.slice(1), ownerOnly);
      if (reason) return { blocked: true, reason };
    }
    if (prog === 'curl' || prog === 'invoke-restmethod' || prog === 'invoke-webrequest' || prog === 'irm' || prog === 'iwr') {
      const text = raw.join(' ').toLowerCase();
      if (text.includes('api.github.com')) {
        if (/\/merge\b/.test(text)) return { blocked: true, reason: 'Merging through the GitHub API is not allowed.' };
        const bad = ownerOnly.find((l) => text.includes(l));
        if (bad && text.includes('labels') && !/delete/.test(text)) return { blocked: true, reason: `Adding the owner-only label \`${bad}\` is not allowed.` };
      }
    }
  }
  for (const inner of nestedCommands(String(cmd || ''), segs)) {
    const r = checkCommand(inner, { ...opts, cwd });
    if (r.blocked) return r;
  }
  return { blocked: false };
}

function gitBranch(dir) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

if (require.main === module) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { input += d; });
  process.stdin.on('end', () => {
    let payload;
    try { payload = JSON.parse(input || '{}'); } catch { process.exit(0); }
    const cmd = payload.tool_input && payload.tool_input.command;
    if (!cmd) process.exit(0);
    let ownerOnlyLabels;
    try { ownerOnlyLabels = require('./lib.cjs').loadConfig().ownerOnlyLabels; } catch { /* defaults */ }
    const r = checkCommand(cmd, { cwd: payload.cwd || process.cwd(), branchOf: gitBranch, ownerOnlyLabels });
    if (r.blocked) {
      process.stderr.write(`Blocked by .claude/implement-issue/scripts/guard.cjs: ${r.reason}\nSee docs/workflow.md (AI agents).\n`);
      process.exit(2);
    }
    process.exit(0);
  });
}

module.exports = { checkCommand, tokenize, toNativePath };

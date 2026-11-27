#!/usr/bin/env node
// Pipeline state that lives on GitHub, so a re-run works the same locally and in Actions.
//   node state.cjs status <N> [--issue-repo o/r] [--cwd <repo>]
//   node state.cjs post-design <N> <design.md> [--risk <risk.json>] [--issue-repo o/r]
//   node state.cjs comment <N> <message.md> [--issue-repo o/r]
//   node state.cjs revoke <N> [--issue-repo o/r]
//   node state.cjs get-design <N> <out.md> [--issue-repo o/r]   writes the latest posted design text
'use strict';
const fs = require('fs');
const path = require('path');
const { loadConfig, gh, ghJson, git, repoInfo, sha12, out, parseArgs, fail } = require('./lib.cjs');

const DESIGN_RE = /<!-- implement-issue:design sha=([0-9a-f]{12}) -->/;
const STATUS_MARKER = '<!-- implement-issue:status -->';

// Logins whose comments count as pipeline state. Anyone can comment on a public repo, so a
// design comment from anyone else is ignored.
function trustedAuthors(cfg) {
  return [cfg.owner, ...(cfg.trustedCommenters || [])].map((a) => a.toLowerCase());
}

// The newest design comment from a trusted author whose text still matches its marker's sha.
// Pass authors = null only in tests.
function findLatestDesign(comments, authors) {
  let latest = null;
  for (const c of comments || []) {
    const m = String(c.body || '').match(DESIGN_RE);
    if (!m) continue;
    const login = String((c.user && c.user.login) || (c.author && c.author.login) || '').toLowerCase();
    if (authors && !authors.includes(login)) continue;
    const text = extractDesign(c.body);
    if (!text || sha12(text) !== m[1]) continue;
    const createdAt = c.created_at || c.createdAt;
    if (!latest || createdAt > latest.createdAt) latest = { id: c.id, sha: m[1], createdAt, body: c.body };
  }
  return latest;
}

// Approved only if the label is on the issue now AND it was added after the latest design comment.
function isApproved(design, events, labelsNow, label) {
  if (!design) return false;
  const names = (labelsNow || []).map((l) => (typeof l === 'string' ? l : l.name));
  if (!names.includes(label)) return false;
  return (events || []).some((e) => e.event === 'labeled' && e.label && e.label.name === label
    && (e.created_at || e.createdAt) > design.createdAt);
}

const WAITING = 'Waiting for owner approval.';

// The design text inside a posted design comment.
function extractDesign(body) {
  const m = String(body || '').match(/<summary>Design<\/summary>\s*\n([\s\S]*?)\n\s*<\/details>\s*$/);
  return m ? m[1].trim() + '\n' : null;
}

function isRisky(risk) {
  return Boolean(risk && (((risk.matches || []).length) || ((risk.judgmentMatches || []).length)));
}

function designComment(designText, { risk, label } = {}) {
  const text = String(designText).trim() + '\n';
  const sha = sha12(text);
  const lines = [`<!-- implement-issue:design sha=${sha} -->`, '**/implement-issue design** (checked by the design-reviewer agent)', ''];
  if (isRisky(risk)) {
    lines.push(`**${WAITING}** This design matches the risk rules below. Review it, then add the \`${label}\` label and run \`/implement-issue\` again.`, '');
    for (const m of risk.matches || []) lines.push(`- **${m.rule}:** \`${m.file}\` (rule \`${m.glob}\`)`);
    for (const j of risk.judgmentMatches || []) lines.push(`- **${j.rule}:** ${j.reason}`);
    lines.push('');
  } else {
    lines.push('No risk rules matched, so the pipeline continues without waiting for approval.', '');
  }
  lines.push('<details open><summary>Design</summary>', '', text.trim(), '', '</details>');
  return { sha, body: lines.join('\n') };
}

function statusComment(message) {
  return `${STATUS_MARKER}\n**/implement-issue stopped**\n\n${String(message).trim()}\n`;
}

function issueRepo(args, cwd) {
  return args['issue-repo'] || repoInfo(cwd).full;
}

function apiList(endpoint) {
  const text = gh(['api', endpoint, '--paginate', '--jq', '.[]']);
  return text ? text.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
}

function status(n, repoFull, cwd) {
  const cfg = loadConfig();
  const issue = ghJson(['issue', 'view', String(n), '-R', repoFull, '--json', 'number,title,state,labels,url']);
  const comments = apiList(`repos/${repoFull}/issues/${n}/comments`);
  const events = apiList(`repos/${repoFull}/issues/${n}/timeline`);
  const design = findLatestDesign(comments, trustedAuthors(cfg));
  const approved = isApproved(design, events, issue.labels, cfg.approvalLabel);
  const here = repoInfo(cwd);
  let remoteBranch = null;
  let pr = null;
  let heads = [];
  try {
    heads = git(['ls-remote', '--heads', 'origin'], cwd).split(/\r?\n/)
      .map((l) => (l.split('\t')[1] || '').replace('refs/heads/', ''))
      .filter((b) => new RegExp(`^[\\w-]+/${n}-`).test(b));
  } catch { /* offline */ }
  // Skip branches whose PRs were all merged or closed: that work is finished, not resumable.
  for (const b of heads) {
    const prs = ghJson(['pr', 'list', '-R', here.full, '--head', b, '--state', 'all', '--json', 'number,url,state']) || [];
    const open = prs.find((p) => p.state === 'OPEN');
    if (open) { remoteBranch = b; pr = { number: open.number, url: open.url }; break; }
    if (prs.length === 0 && !remoteBranch) remoteBranch = b;
  }
  return {
    ok: true,
    issue: { number: issue.number, title: issue.title, state: issue.state, url: issue.url, labels: issue.labels.map((l) => l.name) },
    repo: here.full,
    design: design && { id: design.id, sha: design.sha, createdAt: design.createdAt, waiting: design.body.includes(WAITING) },
    approved,
    remoteBranch,
    pr,
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, n, file] = args._;
  const cwd = path.resolve(args.cwd || process.cwd());
  try {
    if (!cmd || !/^\d+$/.test(n || '')) fail('Usage: state.cjs <status|post-design|comment|revoke> <N> [file]');
    const repoFull = issueRepo(args, cwd);
    const cfg = loadConfig();
    if (cmd === 'status') out(status(n, repoFull, cwd));
    else if (cmd === 'post-design') {
      const risk = args.risk ? JSON.parse(fs.readFileSync(args.risk, 'utf8')) : null;
      const { sha, body } = designComment(fs.readFileSync(file, 'utf8'), { risk, label: cfg.approvalLabel });
      const url = gh(['issue', 'comment', n, '-R', repoFull, '--body-file', '-'], { input: body });
      out({ ok: true, sha, url });
    } else if (cmd === 'comment') {
      const url = gh(['issue', 'comment', n, '-R', repoFull, '--body-file', '-'], { input: statusComment(fs.readFileSync(file, 'utf8')) });
      out({ ok: true, url });
    } else if (cmd === 'get-design') {
      const design = findLatestDesign(apiList(`repos/${repoFull}/issues/${n}/comments`), trustedAuthors(cfg));
      const text = design && extractDesign(design.body);
      if (!text) fail(`No posted design found on ${repoFull}#${n}.`);
      fs.writeFileSync(file, text);
      out({ ok: true, sha: design.sha, path: file });
    } else if (cmd === 'revoke') {
      try { gh(['issue', 'edit', n, '-R', repoFull, '--remove-label', cfg.approvalLabel]); } catch { /* label was not on the issue */ }
      out({ ok: true, removed: cfg.approvalLabel });
    } else fail(`Unknown command: ${cmd}`);
  } catch (e) {
    fail(e.stderr ? String(e.stderr).trim() : e.message);
  }
}

module.exports = { findLatestDesign, isApproved, designComment, statusComment, extractDesign, isRisky, trustedAuthors, WAITING, DESIGN_RE, STATUS_MARKER };

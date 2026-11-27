#!/usr/bin/env node
// Matches files against .claude/implement-issue/risk-rules.md.
//   node risk-check.cjs --from <design-or-plan.md> [--cwd <repo>]   files from the "## Files" section
//   node risk-check.cjs --diff <base-ref> [--cwd <worktree>]        files changed since base-ref (committed + uncommitted)
// Prints {repo, files, matches:[{rule, file, glob}], risky, judgment:{rule: [sentences]}}.
'use strict';
const fs = require('fs');
const path = require('path');
const { PIPELINE_DIR, git, mergeBase, repoInfo, normPath, globToRegExp, parseFileList, out, parseArgs, fail } = require('./lib.cjs');

function parseRiskRules(md) {
  const rules = [];
  let rule = null;
  let block = null;
  for (const line of String(md).split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { rule = { name: h[1], paths: [], judgment: [] }; rules.push(rule); block = null; continue; }
    if (!rule) continue;
    if (/^paths:\s*$/i.test(line.trim())) { block = 'paths'; continue; }
    if (/^judgment:\s*$/i.test(line.trim())) { block = 'judgment'; continue; }
    const item = line.match(/^\s*[-*+]\s+(.+?)\s*$/);
    if (!item || !block) continue;
    if (block === 'paths') {
      const m = item[1].match(/^([\w.-]+):\s*`?(.+?)`?$/);
      if (m) rule.paths.push({ repo: m[1], glob: normPath(m[2]) });
    } else rule.judgment.push(item[1]);
  }
  return rules;
}

function matchRisk(rules, repoName, files) {
  const matches = [];
  for (const rule of rules) {
    for (const p of rule.paths) {
      if (p.repo !== repoName) continue;
      const re = globToRegExp(p.glob);
      for (const f of files) if (re.test(normPath(f))) matches.push({ rule: rule.name, file: normPath(f), glob: p.glob });
    }
  }
  return matches;
}

// Every file that differs from the branch's merge-base with `base`: committed, staged, unstaged and
// untracked. (git diff against a commit compares the working tree, so it covers all but untracked.)
function diffFiles(base, cwd) {
  const mb = mergeBase(cwd, base);
  const tracked = git(['-c', 'core.quotePath=false', 'diff', '--name-only', mb], cwd).split(/\r?\n/);
  const untracked = git(['-c', 'core.quotePath=false', 'ls-files', '--others', '--exclude-standard'], cwd).split(/\r?\n/);
  return [...new Set([...tracked, ...untracked].filter(Boolean).map(normPath))];
}

function loadRules() {
  return parseRiskRules(fs.readFileSync(path.join(PIPELINE_DIR, 'risk-rules.md'), 'utf8'));
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const cwd = path.resolve(args.cwd || process.cwd());
  try {
    const { repo } = repoInfo(cwd);
    let files;
    if (args.from) files = parseFileList(fs.readFileSync(args.from, 'utf8'), repo);
    else if (args.diff) files = diffFiles(args.diff, cwd);
    else fail('Pass --from <file.md> or --diff <base-ref>.');
    const rules = loadRules();
    const matches = matchRisk(rules, repo, files);
    const judgment = Object.fromEntries(rules.map((r) => [r.name, r.judgment]));
    out({ ok: true, repo, files, matches, risky: matches.length > 0, judgment });
  } catch (e) {
    fail(e.message);
  }
}

module.exports = { parseRiskRules, matchRisk, diffFiles, loadRules };

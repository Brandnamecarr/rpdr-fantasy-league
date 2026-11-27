#!/usr/bin/env node
// Commits the worktree, pushes the branch, and opens the PR into main. Never merges.
//   node open-pr.cjs --cwd <worktree> --issue <N> (--title "<title>" | --title-file <path>) [--title-prefix "WIP: "] --body <pr.md> [--issue-repo o/r]
//   node open-pr.cjs --cwd <worktree> --issue <N> (--title "<title>" | --title-file <path>) [--title-prefix "WIP: "] --push-only     (stop after a step limit)
// Prints {ok, branch, pushed, pr: {url}|null}.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadConfig, git, gh, ghJson, repoInfo, workflowChecks, out, parseArgs, readTitle, fail } = require('./lib.cjs');

function issueRef(n, issueRepo, currentRepo) {
  return issueRepo && issueRepo.toLowerCase() !== currentRepo.toLowerCase() ? `${issueRepo}#${n}` : `#${n}`;
}

function commitMessage(title, n, issueRepo, currentRepo, cfg) {
  return `${title}\n\nRefs ${issueRef(n, issueRepo, currentRepo)}\n\n${cfg.commitTrailer}\n${cfg.coAuthor}\n`;
}

// Problems with a PR body: the template sections pr-checks.yml requires, plus a "Closes" link to the issue.
function validatePr(body, { owner, repo }, issue, checks) {
  const problems = checks.checkPrBody(body);
  const linked = checks.linkedIssues(body, { owner, repo });
  if (!linked.length) problems.push('No "Closes #N" link. pr-checks only accepts Closes/Fixes/Resolves; "Relates to" is ignored.');
  else if (issue && !linked.some((l) => l.number === issue.number
    && `${l.owner}/${l.repo}`.toLowerCase() === issue.repo.toLowerCase())) {
    problems.push(`The PR doesn't close ${issue.repo}#${issue.number}.`);
  }
  return problems;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  args.title = readTitle(args);
  const cwd = path.resolve(args.cwd || process.cwd());
  try {
    const cfg = loadConfig();
    const n = Number(args.issue);
    if (!n || !args.title) fail('Usage: open-pr.cjs --cwd <worktree> --issue <N> (--title "<title>" | --title-file <path>) [--title-prefix "WIP: "] (--body <pr.md> | --push-only)');
    const info = repoInfo(cwd);
    const issueRepo = args['issue-repo'] || info.full;
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    if (['main', 'master', 'HEAD'].includes(branch)) fail(`Refusing to commit or push on ${branch}.`);

    let body = null;
    if (!args['push-only']) {
      if (!args.body) fail('Pass --body <pr.md>, or --push-only.');
      body = fs.readFileSync(args.body, 'utf8');
      const problems = validatePr(body, info, { number: n, repo: issueRepo }, workflowChecks(info.root));
      if (problems.length) fail('The PR body would fail pr-checks.', { problems });
    }

    git(['add', '-A'], cwd);
    if (git(['status', '--porcelain'], cwd)) {
      execFileSync('git', ['commit', '-q', '-F', '-'], {
        cwd, input: commitMessage(args.title, n, issueRepo, info.full, cfg), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
      });
    }
    // Plain push of this branch only. Never --force; the guard hook would block it anyway.
    git(['push', '-u', 'origin', branch], cwd);

    if (args['push-only']) { out({ ok: true, branch, pushed: true, pr: null }); process.exit(0); }

    const open = ghJson(['pr', 'list', '-R', info.full, '--head', branch, '--state', 'open', '--json', 'number,url']) || [];
    if (open.length) { out({ ok: true, branch, pushed: true, pr: open[0], existing: true }); process.exit(0); }

    const url = gh(['pr', 'create', '-R', info.full, '--base', 'main', '--head', branch, '--title', args.title, '--body-file', '-'], { input: body });
    out({ ok: true, branch, pushed: true, pr: { url: url.split(/\r?\n/).pop() } });
  } catch (e) {
    fail(e.stderr ? String(e.stderr).trim() : e.message);
  }
}

module.exports = { commitMessage, validatePr, issueRef };

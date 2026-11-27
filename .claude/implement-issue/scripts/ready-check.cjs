#!/usr/bin/env node
// Step 1 of /implement-issue: is the issue open, labeled ready-for-dev, and does it meet the
// definition of ready (checkReady from .github/scripts/workflow-checks.cjs)?
//   node ready-check.cjs <N> [--issue-repo o/r] [--save <RUN dir>]
// Prints {ok, problems, issue: {number, title, url, type, labels, repo}}. Exit 1 when not ready.
'use strict';
const fs = require('fs');
const path = require('path');
const { gh, ghJson, repoInfo, workflowChecks, out, parseArgs, fail } = require('./lib.cjs');

function evaluateReady(issue, checkReady) {
  const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  const problems = [];
  if (String(issue.state).toUpperCase() !== 'OPEN') problems.push('The issue is closed.');
  if (!labels.includes('ready-for-dev')) problems.push('The issue is not labeled `ready-for-dev`. Only the owner adds it.');
  problems.push(...checkReady({ body: issue.body, labels }));
  const typeLabel = labels.find((l) => l.startsWith('type: '));
  return { ok: problems.length === 0, problems, type: typeLabel ? typeLabel.slice(6).trim() : null, labels };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const n = args._[0];
  try {
    if (!/^\d+$/.test(n || '')) fail('Usage: ready-check.cjs <N> [--issue-repo o/r]');
    const repo = args['issue-repo'] || repoInfo().full;
    const issue = ghJson(['issue', 'view', n, '-R', repo, '--json', 'number,title,body,labels,state,url']);
    const r = evaluateReady(issue, workflowChecks().checkReady);
    const summary = { number: issue.number, title: issue.title, url: issue.url, type: r.type, labels: r.labels, repo };
    // --save <RUN>: issue.json for the agents (so they never need gh) and title.txt for the
    // scripts' --title-file (so titles never go through shell quoting).
    if (args.save) {
      fs.mkdirSync(args.save, { recursive: true });
      fs.writeFileSync(path.join(args.save, 'issue.json'), JSON.stringify({ ...summary, body: issue.body }, null, 2));
      fs.writeFileSync(path.join(args.save, 'title.txt'), issue.title);
    }
    out({ ok: r.ok, problems: r.problems, issue: summary, saved: args.save ? path.resolve(args.save) : null });
    process.exit(r.ok ? 0 : 1);
  } catch (e) {
    fail(e.stderr ? String(e.stderr).trim() : e.message);
  }
}

module.exports = { evaluateReady };
void gh;

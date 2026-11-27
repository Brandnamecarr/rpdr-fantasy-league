'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { branchName, slugify, foreignCommits } = require('../make-branch.cjs');
const { commitMessage, validatePr } = require('../open-pr.cjs');
const { evaluateReady } = require('../ready-check.cjs');
const { workflowChecks, loadConfig } = require('../lib.cjs');

const checks = workflowChecks();
const cfg = loadConfig();
const L = { owner: 'Brandnamecarr', repo: 'rpdr-fantasy-league' };

test('branchName follows <type>/<N>-<slug>', () => {
  assert.strictEqual(branchName('bug', 31, 'LeagueStandingView tests fail: mockRosters fixture missing pointUpdates'),
    'bug/31-leaguestandingview-tests-fail');
  assert.strictEqual(branchName('chore', 7, '!!!'), 'chore/7-work');
  assert.strictEqual(slugify('Add /implement-issue: agent pipeline from a ready-for-dev issue'), 'add-implement-issue-agent-pipeline');
  assert.ok(slugify('x '.repeat(30)).length <= 40);
});

test('foreignCommits flags commits without the pipeline trailer', () => {
  const commits = [{ sha: 'a', body: `x\n\n${cfg.commitTrailer}\n` }, { sha: 'b', body: 'hand-made fix' }];
  assert.deepStrictEqual(foreignCommits(commits, cfg.commitTrailer).map((c) => c.sha), ['b']);
});

test('commitMessage carries both trailers and the issue ref', () => {
  const msg = commitMessage('Fix X', 31, 'Brandnamecarr/rpdr-fantasy-league', 'Brandnamecarr/rpdr-fantasy-web', cfg);
  assert.match(msg, /Refs Brandnamecarr\/rpdr-fantasy-league#31/);
  assert.match(msg, /Pipeline-Run: implement-issue\nCo-Authored-By: Claude Opus 5\.5 <noreply@anthropic\.com>\n$/);
  assert.match(commitMessage('Fix X', 5, 'o/r', 'o/r', cfg), /Refs #5/);
});

const goodBody = '## Title\nFix X\n\n## Related Issue\nCloses #31\n\n## What Changed\n- Fixed X\n\n## Proof of Testing\n- [x] Ran tests\n  - Steps: npm test\n  - Result: pass\n';
const issue = { number: 31, repo: 'Brandnamecarr/rpdr-fantasy-league' };

test('validatePr accepts a filled-in template that closes the issue', () => {
  assert.deepStrictEqual(validatePr(goodBody, L, issue, checks), []);
});

test('validatePr flags a missing Closes, "Relates to" alone, the wrong issue, and an empty section', () => {
  assert.ok(validatePr(goodBody.replace('Closes #31', ''), L, issue, checks).some((p) => /Closes/.test(p)));
  assert.ok(validatePr(goodBody.replace('Closes #31', 'Relates to #31'), L, issue, checks).some((p) => /Relates to/.test(p)));
  assert.ok(validatePr(goodBody.replace('#31', '#32'), L, issue, checks).some((p) => /doesn't close/.test(p)));
  assert.ok(validatePr(goodBody.replace(/## Proof of Testing[\s\S]*/, '## Proof of Testing\n- [ ] \n'), L, issue, checks).length > 0);
});

test('validatePr accepts a cross-repo Closes for a web PR', () => {
  const body = goodBody.replace('Closes #31', 'Closes Brandnamecarr/rpdr-fantasy-league#31');
  assert.deepStrictEqual(validatePr(body, { owner: 'Brandnamecarr', repo: 'rpdr-fantasy-web' }, issue, checks), []);
});

const readyBody = '### Description\nDo X.\n\n**Why:** Y.\n\n### Acceptance Criteria\n- [ ] X works\n';
const labels = ['ready-for-dev', 'type: bug', 'area: frontend'];

test('evaluateReady accepts an open, labeled, complete issue', () => {
  const r = evaluateReady({ state: 'OPEN', body: readyBody, labels: labels.map((name) => ({ name })) }, checks.checkReady);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.type, 'bug');
});

test('evaluateReady rejects closed, unlabeled or incomplete issues', () => {
  assert.strictEqual(evaluateReady({ state: 'CLOSED', body: readyBody, labels }, checks.checkReady).ok, false);
  assert.strictEqual(evaluateReady({ state: 'OPEN', body: readyBody, labels: labels.slice(1) }, checks.checkReady).ok, false);
  assert.strictEqual(evaluateReady({ state: 'OPEN', body: '### Description\nX', labels }, checks.checkReady).ok, false);
});

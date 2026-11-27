'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { checkCommand } = require('../guard.cjs');

const onFeature = { branchOf: () => 'chore/1-x', cwd: '/repo' };
const onMain = { branchOf: () => 'main', cwd: '/repo' };

const blocked = [
  'git push origin main',
  'git push origin HEAD:main',
  'git push origin feature:refs/heads/main',
  'git push origin master',
  'git push origin +feature',
  'git push -f',
  'git push -fu origin x',
  'git push --force origin x',
  'git push --force-with-lease origin x',
  'git push origin --delete x',
  'git push origin :x',
  'git push --all origin',
  'git -C ../x push origin main',
  'npm test && git push origin main',
  'npm test; git push origin main',
  'echo hi | git push origin main',
  'FOO=1 git push origin main',
  'bash -c "git push origin main"',
  'echo $(git push origin main)',
  'gh pr merge 5',
  'gh pr merge 5 --squash',
  'gh api -X PUT repos/o/r/pulls/5/merge',
  'gh issue edit 3 --add-label "ready-for-dev"',
  'gh issue edit 3 --add-label=ready-for-dev',
  'gh pr edit 3 --add-label skip-issue-check',
  'gh issue edit 3 --add-label "type: bug,design-approved"',
  'gh issue create --title x --label ready-for-dev',
  'gh api repos/o/r/issues/3/labels -f "labels[]=design-approved"',
  '"/c/Program Files/GitHub CLI/gh.exe" pr merge 5',
  'curl -X POST https://api.github.com/repos/o/r/issues/3/labels -d \'{"labels":["ready-for-dev"]}\'',
];

const allowed = [
  'git push -u origin chore/1-x',
  'git push origin chore/1-x',
  'git push',
  'git status && git diff',
  'gh issue edit 3 --remove-label design-approved',
  'gh api -X DELETE repos/o/r/issues/3/labels/design-approved',
  'gh issue view 3 --json labels',
  'gh issue create --title x --label needs-refinement --label "type: bug"',
  'gh pr create --base main --head chore/1-x --title t --body-file b.md',
  'npm run build',
  'git log main..HEAD',
  'git diff origin/main',
  'echo "git push origin main is forbidden"',
];

for (const cmd of blocked) {
  test(`blocks: ${cmd}`, () => {
    const r = checkCommand(cmd, onFeature);
    assert.strictEqual(r.blocked, true, `expected block for ${cmd}`);
    assert.ok(r.reason);
  });
}

for (const cmd of allowed) {
  test(`allows: ${cmd}`, () => {
    assert.deepStrictEqual(checkCommand(cmd, onFeature), { blocked: false });
  });
}

test('bare git push is blocked when on main', () => {
  assert.strictEqual(checkCommand('git push', onMain).blocked, true);
  assert.strictEqual(checkCommand('git push origin HEAD', onMain).blocked, true);
  assert.strictEqual(checkCommand('git push -u origin chore/1-x', onMain).blocked, false);
});

test('cd and -C change which branch is checked', () => {
  const branchOf = (dir) => (dir.replace(/\\/g, '/').endsWith('/main-checkout') ? 'main' : 'chore/1-x');
  assert.strictEqual(checkCommand('cd /x/main-checkout && git push', { branchOf, cwd: '/x/wt' }).blocked, true);
  assert.strictEqual(checkCommand('git -C /x/main-checkout push', { branchOf, cwd: '/x/wt' }).blocked, true);
  assert.strictEqual(checkCommand('git push', { branchOf, cwd: '/x/wt' }).blocked, false);
});

test('Windows paths and variables for gh are still caught', () => {
  for (const cmd of [
    '& "C:\\Program Files\\GitHub CLI\\gh.exe" pr merge 5 --squash',
    '"C:\\Program Files\\GitHub CLI\\gh.exe" pr merge 5',
    'GH=/c/x/gh.exe; "$GH" pr merge 5',
    '"$GH" issue edit 3 --add-label ready-for-dev',
    '"$GIT" push origin main',
  ]) assert.strictEqual(checkCommand(cmd, onFeature).blocked, true, cmd);
  assert.strictEqual(checkCommand('"C:\\Program Files\\GitHub CLI\\gh.exe" issue view 3', onFeature).blocked, false);
});

test('dynamic refspecs and unknown branches are treated like a bare push', () => {
  assert.strictEqual(checkCommand('git push -u origin "$(git branch --show-current)"', onMain).blocked, true);
  assert.strictEqual(checkCommand('git push -u origin "$(git branch --show-current)"', onFeature).blocked, false);
  assert.strictEqual(checkCommand('git push', { branchOf: () => null, cwd: '/repo' }).blocked, true);
  assert.strictEqual(checkCommand('git push -u origin chore/1-x', { branchOf: () => null, cwd: '/repo' }).blocked, false);
});

test('Git Bash and PowerShell cd forms resolve the right directory', () => {
  const seen = [];
  const branchOf = (dir) => { seen.push(dir.replace(/\\/g, '/')); return 'main'; };
  checkCommand('cd /c/Users/me/repo && git push', { branchOf, cwd: 'C:/x' });
  checkCommand('Set-Location -Path "C:\\Users\\me\\repo"; git push', { branchOf, cwd: 'C:/x' });
  checkCommand('git -C "C:\\Users\\me\\repo" push', { branchOf, cwd: 'C:/x' });
  if (process.platform === 'win32') {
    assert.deepStrictEqual(seen, ['C:/Users/me/repo', 'C:/Users/me/repo', 'C:/Users/me/repo']);
  } else {
    assert.strictEqual(seen[0], '/c/Users/me/repo');
  }
});

test('hook CLI exits 2 with a reason when blocked, 0 otherwise', () => {
  const script = path.join(__dirname, '..', 'guard.cjs');
  const run = (command) => spawnSync(process.execPath, [script], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: __dirname }), encoding: 'utf8',
  });
  const b = run('gh pr merge 1');
  assert.strictEqual(b.status, 2);
  assert.match(b.stderr, /not allowed/);
  assert.strictEqual(run('npm run build').status, 0);
  assert.strictEqual(spawnSync(process.execPath, [script], { input: 'not json', encoding: 'utf8' }).status, 0);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { lintMessage, parseLint, parseTests, staticCounts, compare, removedAssertions, depChanges, unplannedFiles } = require('../verify.cjs');

const root = path.resolve('/repo');
const at = (p) => path.join(root, p);

const base = { lint: { 'src/a.ts|no-unused-vars|x is unused': 1 }, failing: ['src/t.test.tsx > old failure'], staticTests: 10, skips: 0 };
const good = { build: { ok: true }, lint: { 'src/a.ts|no-unused-vars|x is unused': 1 }, tests: { skipped: false, failing: ['src/t.test.tsx > old failure'] }, staticTests: 11, skips: 0 };

test('passes when only main\'s existing failures remain (non-strict)', () => {
  assert.deepStrictEqual(compare(base, good, { strict: false }), { ok: true, failures: [] });
});

test('strict mode fails on any lint error or failing test', () => {
  const r = compare(base, good, { strict: true });
  assert.strictEqual(r.ok, false);
  assert.ok(r.failures.some((f) => f.startsWith('New lint error')));
  assert.ok(r.failures.some((f) => f.startsWith('Failing test')));
});

test('fails on build failure', () => {
  assert.ok(compare(base, { ...good, build: { ok: false } }, { strict: false }).failures.includes('Build failed.'));
});

test('fails on a new lint key or a higher count', () => {
  const newKey = { ...good, lint: { ...good.lint, 'src/b.ts|eqeqeq|use ===': 1 } };
  assert.strictEqual(compare(base, newKey, { strict: false }).ok, false);
  const more = { ...good, lint: { 'src/a.ts|no-unused-vars|x is unused': 2 } };
  assert.match(compare(base, more, { strict: false }).failures[0], /2 now, 1 on main/);
});

test('fails on a failing test main does not have', () => {
  const r = compare(base, { ...good, tests: { skipped: false, failing: ['src/t.test.tsx > new'] } }, { strict: false });
  assert.deepStrictEqual(r.failures, ['Failing test: src/t.test.tsx > new']);
});

test('fails when the test count drops or a skip is added', () => {
  assert.match(compare(base, { ...good, staticTests: 9 }, { strict: false }).failures[0], /Test count dropped/);
  assert.match(compare(base, { ...good, skips: 1 }, { strict: false }).failures[0], /skip/);
});

test('skipped test step (no tests yet) is not a failure', () => {
  const r = compare({ ...base, staticTests: 0 }, { ...good, lint: null, tests: { skipped: true, failing: [] }, staticTests: 0 }, { strict: true });
  assert.deepStrictEqual(r, { ok: true, failures: [] });
});

test('runner errors are failures', () => {
  assert.match(compare(base, { ...good, errors: ['The test runner did not produce a report'] }, { strict: false }).failures[0], /did not produce/);
});

test('parseLint ignores line numbers and warnings', () => {
  const report = [{ filePath: at('src/a.ts'), messages: [
    { severity: 2, ruleId: 'no-unused-vars', message: 'x is unused', line: 3 },
    { severity: 2, ruleId: 'no-unused-vars', message: 'x is unused', line: 90 },
    { severity: 1, ruleId: 'semi', message: 'warn', line: 1 },
  ] }];
  assert.deepStrictEqual(parseLint(report, root), { 'src/a.ts|no-unused-vars|x is unused': 2 });
});

test('parseTests reads jest/vitest JSON', () => {
  const report = { numTotalTests: 3, testResults: [
    { name: at('src/x.test.ts'), status: 'failed', assertionResults: [
      { fullName: 'X works', status: 'passed' }, { fullName: 'X breaks', status: 'failed' }] },
    { name: at('src/y.test.ts'), status: 'failed', assertionResults: [] },
  ] };
  assert.deepStrictEqual(parseTests(report, root), {
    failing: ['src/x.test.ts > X breaks', 'src/y.test.ts > (test file failed to run)'], total: 3,
  });
});

test('staticCounts counts tests and skips', () => {
  const text = [
    "it('a', () => {})", "test('b', () => {})", "it.each([1,2])('c %s', () => {})",
    "it.skip('d', () => {})", "xit('e', () => {})", "describe.only('f', () => {})",
    'const split = s.split(","); submit(x); wait(1);',
  ].join('\n');
  assert.deepStrictEqual(staticCounts([{ path: 'a.test.ts', text }]), { tests: 4, skips: 3 });
});

test('removedAssertions finds deleted expect/assert lines', () => {
  const diff = [
    'diff --git a/src/t.test.ts b/src/t.test.ts', '--- a/src/t.test.ts', '+++ b/src/t.test.ts',
    '@@ -1,3 +1,3 @@', '-  expect(total).toBe(3);', '+  expect(total).toBeGreaterThan(0);', '   other();',
  ].join('\n');
  assert.deepStrictEqual(removedAssertions(diff), [{ file: 'src/t.test.ts', line: 'expect(total).toBe(3);' }]);
});

test('depChanges lists added, upgraded and removed packages', () => {
  const r = depChanges({ dependencies: { a: '^1.0.0', b: '^2.0.0' } }, { dependencies: { a: '^1.1.0', c: '^3.0.0' }, devDependencies: { d: '^4' } });
  assert.deepStrictEqual(r.map((x) => `${x.name}:${x.from}->${x.to}`).sort(), ['a:^1.0.0->^1.1.0', 'b:^2.0.0->null', 'c:null->^3.0.0', 'd:null->^4']);
});

test('unplannedFiles skips planned files, tests and package files', () => {
  assert.deepStrictEqual(
    unplannedFiles(['src/a.ts', 'src/b.ts', 'src/__tests__/a.test.ts', 'package.json', 'package-lock.json'], ['src/a.ts'], '\\.test\\.ts$'),
    ['src/b.ts'],
  );
});

test('lint keys drop absolute paths and code frames', () => {
  const msg = (dir) => `Error: Calling setState synchronously within an effect\n\nmore text\n\n${dir}\\src\\a.tsx:24:13\n> 24 | setX(1);`;
  assert.strictEqual(lintMessage(msg('C:\\wt\\one')), 'Error: Calling setState synchronously within an effect');
  const a = parseLint([{ filePath: path.join(root, 'src/a.tsx'), messages: [{ severity: 2, ruleId: 'r', message: msg('C:\\wt\\one') }] }], root);
  const b = parseLint([{ filePath: path.join(root, 'src/a.tsx'), messages: [{ severity: 2, ruleId: 'r', message: msg('C:\\wt\\two') }] }], root);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(lintMessage("'x' is defined but never used. See /home/u/proj/src/a.ts:3:1"), "'x' is defined but never used. See <path>");
});

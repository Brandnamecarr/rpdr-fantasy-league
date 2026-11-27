'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { globToRegExp, normPath, parseFileList, sha12, parseArgs, loadConfig } = require('../lib.cjs');

test('globToRegExp: ** crosses directories, * does not', () => {
  assert.ok(globToRegExp('src/routes/**').test('src/routes/a/b.ts'));
  assert.ok(globToRegExp('src/routes/**').test('src/routes/user.routes.ts'));
  assert.ok(!globToRegExp('src/routes/**').test('src/app.ts'));
  assert.ok(globToRegExp('src/*.ts').test('src/app.ts'));
  assert.ok(!globToRegExp('src/*.ts').test('src/routes/a.ts'));
  assert.ok(globToRegExp('**/AuthContext*').test('src/components/utilities/AuthContext.tsx'));
  assert.ok(globToRegExp('prisma/schema.prisma').test('prisma/schema.prisma'));
  assert.ok(!globToRegExp('prisma/schema.prisma').test('prisma/schemaXprisma'));
});

test('normPath handles Windows separators and ./', () => {
  assert.strictEqual(normPath('.\\src\\a.ts'), 'src/a.ts');
  assert.strictEqual(normPath('./src/a.ts'), 'src/a.ts');
});

test('parseFileList keeps unprefixed and own-repo entries only', () => {
  const md = [
    '# Design', '- not a file section',
    '## Files',
    '- `src/routes/user.routes.ts`',
    '- rpdr-fantasy-league:src/app.ts',
    '- rpdr-fantasy-web:src/components/utilities/types.ts',
    '- src\\services\\x.ts (new)',
    '## Risks', '- src/ignored.ts',
  ].join('\n');
  assert.deepStrictEqual(parseFileList(md, 'rpdr-fantasy-league'),
    ['src/routes/user.routes.ts', 'src/app.ts', 'src/services/x.ts']);
  assert.deepStrictEqual(parseFileList(md, 'rpdr-fantasy-web'),
    ['src/routes/user.routes.ts', 'src/components/utilities/types.ts', 'src/services/x.ts']);
});

test('parseFileList accepts "repo: path" with a space and backticks', () => {
  const md = '## Files\n- rpdr-fantasy-league: src/routes/x.ts (modified): why\n- `rpdr-fantasy-web: src/a.tsx`\n- rpdr-fantasy-league:`src/b.ts`\n';
  assert.deepStrictEqual(parseFileList(md, 'rpdr-fantasy-league'), ['src/routes/x.ts', 'src/b.ts']);
  assert.deepStrictEqual(parseFileList(md, 'rpdr-fantasy-web'), ['src/a.tsx']);
});

test('sha12 is stable and 12 hex chars', () => {
  assert.match(sha12('abc'), /^[0-9a-f]{12}$/);
  assert.strictEqual(sha12('abc'), sha12('abc'));
});

test('parseArgs', () => {
  assert.deepStrictEqual(parseArgs(['5', '--cwd', 'x', '--push-only']), { _: ['5'], cwd: 'x', 'push-only': true });
});

test('config has both repos and the owner-only labels', () => {
  const c = loadConfig();
  assert.ok(c.repos['rpdr-fantasy-league'] && c.repos['rpdr-fantasy-web']);
  assert.deepStrictEqual(c.ownerOnlyLabels.sort(), ['design-approved', 'ready-for-dev', 'skip-issue-check']);
  assert.strictEqual(c.limits.designRounds, 2);
  assert.strictEqual(c.limits.verifyLoops, 3);
});

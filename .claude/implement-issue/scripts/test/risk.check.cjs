'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseRiskRules, matchRisk, loadRules } = require('../risk-check.cjs');

const L = 'rpdr-fantasy-league';
const W = 'rpdr-fantasy-web';

test('the real risk-rules.md parses into the three starting rules', () => {
  const rules = loadRules();
  assert.deepStrictEqual(rules.map((r) => r.name), ['API contract', 'Schema and migrations', 'Auth']);
  for (const r of rules) {
    assert.ok(r.paths.length > 0, `${r.name} has paths`);
    assert.ok(r.judgment.length > 0, `${r.name} has judgment lines`);
  }
});

test('league paths match the right rules', () => {
  const rules = loadRules();
  const m = matchRisk(rules, L, ['src/routes/user.routes.ts', 'prisma/schema.prisma', 'src/services/x.ts', 'src\\util\\credentials\\TokenManager.ts']);
  assert.deepStrictEqual(m.map((x) => [x.rule, x.file]), [
    ['API contract', 'src/routes/user.routes.ts'],
    ['Schema and migrations', 'prisma/schema.prisma'],
    ['Auth', 'src/util/credentials/TokenManager.ts'],
  ]);
});

test('web paths match only in web', () => {
  const rules = loadRules();
  assert.strictEqual(matchRisk(rules, W, ['src/components/utilities/types.ts'])[0].rule, 'API contract');
  assert.deepStrictEqual(matchRisk(rules, L, ['src/components/utilities/types.ts']), []);
  assert.strictEqual(matchRisk(rules, W, ['src/components/utilities/AuthContext.tsx'])[0].rule, 'Auth');
});

test('safe files do not match', () => {
  assert.deepStrictEqual(matchRisk(loadRules(), L, ['src/services/league.service.ts', 'docs/README.md']), []);
});

test('parseRiskRules ignores items outside Paths/Judgment blocks', () => {
  const rules = parseRiskRules('## R\nIntro\n- stray\nPaths:\n- repo-a: x/**\nJudgment:\n- be careful\n');
  assert.deepStrictEqual(rules, [{ name: 'R', paths: [{ repo: 'repo-a', glob: 'x/**' }], judgment: ['be careful'] }]);
});

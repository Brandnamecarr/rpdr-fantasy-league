'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseReview } = require('../gate.cjs');

const RULES = ['API contract', 'Schema and migrations', 'Auth'];
const review = (verdict, risk, findings = 'None.') => `VERDICT: ${verdict}\n\n## Findings\n${findings}\n\n## Risk judgment\n${risk}\n`;
const allNo = '- API contract: NO: no routes change\n- Schema and migrations: NO: none\n- Auth: NO: none';

test('PASS with all NO judgments is clean', () => {
  assert.deepStrictEqual(parseReview(review('PASS', allNo), RULES), { verdict: 'PASS', blocking: [], judgmentMatches: [], problems: [] });
});

test('a MATCH line becomes a judgment match with its reason', () => {
  const r = parseReview(review('PASS', allNo.replace('Auth: NO: none', 'Auth: MATCH: changes who can call /admin')), RULES);
  assert.deepStrictEqual(r.judgmentMatches, [{ rule: 'Auth', reason: 'changes who can call /admin' }]);
});

test('accepts bold rule names and dash separators', () => {
  const r = parseReview(review('PASS', '- **API contract**: MATCH - response shape changes\n- Schema and migrations: NO\n- Auth: NO'), RULES);
  assert.deepStrictEqual(r.judgmentMatches, [{ rule: 'API contract', reason: 'response shape changes' }]);
});

test('a rule with no judgment counts as a match', () => {
  const r = parseReview(review('PASS', '- API contract: NO: x\n- Auth: NO: y'), RULES);
  assert.deepStrictEqual(r.judgmentMatches.map((j) => j.rule), ['Schema and migrations']);
});

test('a missing or malformed VERDICT is a FAIL', () => {
  assert.strictEqual(parseReview('Looks good to me!', RULES).verdict, 'FAIL');
  assert.strictEqual(parseReview('VERDICT: PASS-ish', RULES).verdict, 'FAIL');
});

test('PASS with a blocking finding is treated as FAIL', () => {
  const r = parseReview(review('PASS', allNo, '1. [blocking] src/x.ts does not exist'), RULES);
  assert.strictEqual(r.verdict, 'FAIL');
  assert.deepStrictEqual(r.blocking, ['[blocking] src/x.ts does not exist']);
});

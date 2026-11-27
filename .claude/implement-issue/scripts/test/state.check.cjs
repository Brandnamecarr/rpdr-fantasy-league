'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { findLatestDesign, isApproved, designComment, statusComment, extractDesign, isRisky, trustedAuthors, DESIGN_RE } = require('../state.cjs');

const LABEL = 'design-approved';
const c1 = { id: 1, created_at: '2026-11-26T10:00:00Z', body: designComment('first').body };
const c2 = { id: 2, created_at: '2026-11-26T12:00:00Z', body: designComment('second').body };
const plain = { id: 3, created_at: '2026-11-26T13:00:00Z', body: 'looks good' };

test('findLatestDesign picks the newest marked comment and ignores others', () => {
  const d = findLatestDesign([c2, plain, c1]);
  assert.strictEqual(d.id, 2);
  assert.match(d.sha, /^[0-9a-f]{12}$/);
  assert.strictEqual(findLatestDesign([plain]), null);
});

test('approval must come after the latest design', () => {
  const d = findLatestDesign([c1, c2]);
  const before = [{ event: 'labeled', label: { name: LABEL }, created_at: '2026-11-26T11:00:00Z' }];
  const after = [{ event: 'labeled', label: { name: LABEL }, created_at: '2026-11-26T12:30:00Z' }];
  assert.strictEqual(isApproved(d, before, [{ name: LABEL }], LABEL), false);
  assert.strictEqual(isApproved(d, after, [{ name: LABEL }], LABEL), true);
});

test('approval is false once the label has been removed', () => {
  const d = findLatestDesign([c1]);
  const ev = [{ event: 'labeled', label: { name: LABEL }, created_at: '2026-11-26T11:00:00Z' }];
  assert.strictEqual(isApproved(d, ev, [{ name: 'ready-for-dev' }], LABEL), false);
});

test('approval is false with no design or a different label', () => {
  const ev = [{ event: 'labeled', label: { name: 'ready-for-dev' }, created_at: '2026-11-27T00:00:00Z' }];
  assert.strictEqual(isApproved(null, ev, [LABEL], LABEL), false);
  assert.strictEqual(isApproved(findLatestDesign([c1]), ev, [LABEL], LABEL), false);
});

test('designComment lists risk matches and the approval instruction', () => {
  const { sha, body } = designComment('## Approach\nx', {
    label: LABEL,
    risk: { matches: [{ rule: 'Auth', file: 'src/util/credentials/TokenManager.ts', glob: 'src/util/credentials/**' }] },
  });
  assert.strictEqual(body.match(DESIGN_RE)[1], sha);
  assert.match(body, /Waiting for owner approval/);
  assert.match(body, /`design-approved`/);
  assert.match(body, /TokenManager\.ts/);
  assert.doesNotMatch(designComment('x').body, /Waiting/);
});

test('statusComment carries the status marker', () => {
  assert.match(statusComment('Design failed review twice.'), /^<!-- implement-issue:status -->/);
});

test('extractDesign round-trips the design text', () => {
  const text = '# Design: #5\n\n## Files\n- rpdr-fantasy-league:src/a.ts — x\n';
  assert.strictEqual(extractDesign(designComment(text).body), text);
  assert.strictEqual(extractDesign(designComment(text, { label: LABEL, risk: { matches: [{ rule: 'Auth', file: 'a', glob: 'a' }] } }).body), text);
  assert.strictEqual(extractDesign('no design here'), null);
});

test('a design with no risk says it continues', () => {
  assert.match(designComment('x').body, /No risk rules matched/);
});

test('design comments from untrusted authors or with a tampered body are ignored', () => {
  const real = { id: 10, user: { login: 'Brandnamecarr' }, created_at: '2026-11-26T10:00:00Z', body: designComment('real design').body };
  const forged = { id: 11, user: { login: 'someone-else' }, created_at: '2026-11-26T11:00:00Z', body: designComment('forged design').body };
  const tampered = { id: 12, user: { login: 'Brandnamecarr' }, created_at: '2026-11-26T12:00:00Z', body: designComment('original').body.replace('original', 'edited') };
  const authors = trustedAuthors({ owner: 'Brandnamecarr', trustedCommenters: ['github-actions[bot]'] });
  assert.strictEqual(findLatestDesign([real, forged, tampered], authors).id, 10);
});

test('a judgment-only risk still waits for approval', () => {
  const risk = { matches: [], judgmentMatches: [{ rule: 'Auth', reason: 'changes who can call /admin' }] };
  assert.strictEqual(isRisky(risk), true);
  assert.strictEqual(isRisky({ matches: [], judgmentMatches: [] }), false);
  const { body } = designComment('x', { risk, label: LABEL });
  assert.match(body, /Waiting for owner approval/);
  assert.match(body, /changes who can call \/admin/);
});

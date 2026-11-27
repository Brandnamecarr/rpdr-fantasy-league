'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const CLAUDE = path.resolve(__dirname, '..', '..', '..');
const EXPECTED = {
  designer: 'xhigh',
  'design-reviewer': 'xhigh',
  planner: 'high',
  implementer: 'medium',
  tester: 'high',
  'pr-author': 'low',
};

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(m, `${file} has frontmatter`);
  return Object.fromEntries(m[1].split(/\r?\n/).map((l) => l.match(/^([\w-]+):\s*(.*)$/)).filter(Boolean).map((x) => [x[1], x[2].trim()]));
}

for (const [name, effort] of Object.entries(EXPECTED)) {
  test(`agent ${name} frontmatter`, () => {
    const fm = frontmatter(path.join(CLAUDE, 'agents', `${name}.md`));
    assert.strictEqual(fm.name, name);
    assert.ok(fm.description && fm.description.length > 20);
    assert.strictEqual(fm.model, 'claude-opus-5-5');
    assert.strictEqual(fm.effort, effort);
    assert.match(fm.maxTurns, /^\d+$/);
    assert.ok(fm.tools.includes('Read'));
  });
}

test('read-only agents cannot Edit', () => {
  for (const name of ['designer', 'design-reviewer', 'planner', 'pr-author']) {
    assert.match(frontmatter(path.join(CLAUDE, 'agents', `${name}.md`)).disallowedTools || '', /\bEdit\b/, name);
  }
});

test('the skill names every agent and every script', () => {
  const skill = fs.readFileSync(path.join(CLAUDE, 'skills', 'implement-issue', 'SKILL.md'), 'utf8');
  assert.strictEqual(frontmatter(path.join(CLAUDE, 'skills', 'implement-issue', 'SKILL.md')).name, 'implement-issue');
  for (const name of Object.keys(EXPECTED)) assert.ok(skill.includes(`\`${name}\``), `skill uses ${name}`);
  for (const script of ['ready-check.cjs', 'state.cjs', 'risk-check.cjs', 'gate.cjs', 'make-branch.cjs', 'open-pr.cjs']) {
    assert.ok(skill.includes(script), `skill uses ${script}`);
    assert.ok(fs.existsSync(path.join(CLAUDE, 'implement-issue', 'scripts', script)), `${script} exists`);
  }
});

test('settings.json wires the guard hook and denies merges and force-pushes', () => {
  const s = JSON.parse(fs.readFileSync(path.join(CLAUDE, 'settings.json'), 'utf8'));
  const hook = s.hooks.PreToolUse.find((h) => /Bash/.test(h.matcher));
  assert.match(hook.hooks[0].command, /guard\.cjs/);
  assert.ok(s.permissions.deny.includes('Bash(gh pr merge *)'));
  assert.ok(s.permissions.deny.some((d) => d.startsWith('Bash(git push --force')));
});

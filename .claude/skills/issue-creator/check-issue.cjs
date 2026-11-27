// Checks an issue draft before `gh issue create`.
// Usage: node .claude/skills/issue-creator/check-issue.cjs <body-file> "<label>" "<label>" ...
// Runs the same definition-of-ready check the sync-readiness-labels workflow runs
// (.github/scripts/workflow-checks.cjs), plus the issue-creator rules in SKILL.md.
const fs = require('fs');
const path = require('path');
const { sections, meaningful, checkReady } = require(path.join(process.cwd(), '.github/scripts/workflow-checks.cjs'));

const [bodyFile, ...labels] = process.argv.slice(2);
if (!bodyFile) {
  console.error('Usage: node .claude/skills/issue-creator/check-issue.cjs <body-file> "<label>" ...');
  process.exit(2);
}
const body = fs.readFileSync(bodyFile, 'utf8');
const problems = checkReady({ body, labels });

if (!labels.includes('needs-refinement')) problems.push('Add the `needs-refinement` label.');
if (labels.includes('ready-for-dev')) problems.push('Remove `ready-for-dev`: only the owner adds it.');
if (labels.includes('skip-issue-check')) problems.push('Remove `skip-issue-check`: it is for PRs, owner-only.');

const description = sections(body)['description'] || [];
for (const slot of ['Why', 'Context', 'Open questions']) {
  const line = description.find((l) => l.trim().startsWith(`**${slot}:**`));
  if (!line) problems.push(`The Description is missing the \`**${slot}:**\` line.`);
  else if (slot === 'Why' && meaningful([line.replace(`**${slot}:**`, '')]).length === 0) {
    problems.push('`**Why:**` is empty. Give the justification and its evidence.');
  }
}

const criteria = meaningful(sections(body)['acceptance criteria'] || []);
for (const c of criteria) {
  if (/^(investigate|decide|confirm|look into|figure out|research|explore)\b/i.test(c) || /^root cause\b/i.test(c)) {
    problems.push(`Acceptance criterion "${c}" is a task, not an outcome. Move it to **Open questions:** and write the testable end state.`);
  }
}

if (problems.length) {
  console.log(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log('OK: ready to create.');

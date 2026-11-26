// Shared checks used by .github/workflows/sync-readiness-labels.yml and
// .github/workflows/pr-checks.yml. The rules are documented in docs/workflow.md.
// This file is identical in rpdr-fantasy-league, rpdr-fantasy-web and rpdr-fantasy-ios-app.

// Split a Markdown body into { "heading text (lowercase)": [lines...] }.
// HTML comments (template hints) are removed first.
function sections(body) {
  const out = {};
  let current = null;
  const text = (body || '').replace(/<!--[\s\S]*?-->/g, '');
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      current = heading[1].trim().toLowerCase();
      out[current] = [];
    } else if (current) {
      out[current].push(line);
    }
  }
  return out;
}

// Lines that still say something once bullets, checkboxes and template
// placeholders are stripped.
function meaningful(lines) {
  return (lines || [])
    .map((l) => l
      .replace(/^\s*(?:[-*+]|\d+\.)\s*/, '')
      .replace(/^\[[ xX]\]\s*/, '')
      .replace(/^(?:steps|result)\s*:\s*/i, '')
      .trim())
    .filter((t) => t && t !== '_No response_' && !/^(?:closes|fixes|resolves)\s*#?\s*$/i.test(t));
}

// Definition of ready for an issue. Returns a list of problems (empty = ready).
function checkReady(issue) {
  const problems = [];
  const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  const types = labels.filter((l) => l.startsWith('type: '));
  const areas = labels.filter((l) => l.startsWith('area: '));

  if (types.length === 0) problems.push('Missing a `type:` label (feature, bug, refactor, or epic).');
  if (types.length > 1) problems.push(`Has ${types.length} \`type:\` labels (${types.join(', ')}); use exactly one.`);
  if (labels.includes('type: epic')) problems.push('Epics are too big to implement directly. Break it into smaller issues and mark those ready instead.');
  if (areas.length === 0) problems.push('Missing an `area:` label (frontend, backend, infra, ios, business, or testing).');

  const s = sections(issue.body);
  const criteria = s['acceptance criteria'];
  const description = s['description']
    ?? (issue.body || '').replace(/<!--[\s\S]*?-->/g, '').split(/^#{1,6}\s+acceptance criteria.*$/im)[0].split(/\r?\n/);

  if (meaningful(description).length === 0) problems.push('The **Description** is empty.');
  if (!criteria) {
    problems.push('Missing an **Acceptance Criteria** section. Add a `### Acceptance Criteria` heading with at least one `- [ ]` item.');
  } else if (!criteria.some((l) => /^\s*[-*+]\s*\[[ xX]\]\s*\S/.test(l))) {
    problems.push('**Acceptance Criteria** needs at least one filled-in checkbox item (`- [ ] ...`).');
  }
  return problems;
}

// Template completeness for a PR body. Returns a list of problems.
function checkPrBody(body) {
  const problems = [];
  const s = sections(body);
  for (const name of ['what changed', 'proof of testing']) {
    const title = name.replace(/\b\w/g, (c) => c.toUpperCase());
    if (!(name in s)) problems.push(`Missing the **${title}** section from the PR template.`);
    else if (meaningful(s[name]).length === 0) problems.push(`The **${title}** section is empty.`);
  }
  return problems;
}

// Issues the PR body says it closes: "Closes #12", "Fixes owner/repo#12",
// "Resolves https://github.com/owner/repo/issues/12".
function linkedIssues(body, repo) {
  const text = (body || '').replace(/<!--[\s\S]*?-->/g, '');
  const kw = '(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s*:?\\s+';
  const found = new Map();
  const add = (owner, name, number) => {
    const key = `${owner}/${name}#${number}`.toLowerCase();
    if (!found.has(key)) found.set(key, { owner, repo: name, number: Number(number) });
  };
  for (const m of text.matchAll(new RegExp(`\\b${kw}(?:([\\w.-]+)\\/([\\w.-]+))?#(\\d+)\\b`, 'gi'))) {
    add(m[1] || repo.owner, m[2] || repo.repo, m[3]);
  }
  for (const m of text.matchAll(new RegExp(`\\b${kw}https:\\/\\/github\\.com\\/([\\w.-]+)\\/([\\w.-]+)\\/issues\\/(\\d+)`, 'gi'))) {
    add(m[1], m[2], m[3]);
  }
  return [...found.values()];
}

module.exports = { sections, meaningful, checkReady, checkPrBody, linkedIssues };

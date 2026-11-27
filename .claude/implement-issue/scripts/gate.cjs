#!/usr/bin/env node
// Reads the design-reviewer's verdict and combines it with risk-check's path matches.
//   node gate.cjs <review-k.md> <risk.json> [--out <risk-gate.json>]
// Prints {ok, verdict: PASS|FAIL, blocking: [..], matches: [..], judgmentMatches: [{rule, reason}], risky}.
// Anything it can't parse counts against the design: a missing or malformed VERDICT is a FAIL, and
// a risk rule the reviewer gave no judgment for counts as a MATCH.
'use strict';
const fs = require('fs');
const { out, parseArgs, fail } = require('./lib.cjs');
const { loadRules } = require('./risk-check.cjs');

function parseReview(md, ruleNames) {
  const lines = String(md || '').split(/\r?\n/);
  const first = (lines.find((l) => l.trim()) || '').trim();
  const verdict = /^VERDICT:\s*PASS\s*$/.test(first) ? 'PASS' : 'FAIL';
  const blocking = lines.filter((l) => /\[blocking\]/i.test(l)).map((l) => l.replace(/^\s*\d+\.\s*/, '').trim());

  const judged = new Map();
  let inRisk = false;
  for (const l of lines) {
    const h = l.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h) { inRisk = /^risk judgment$/i.test(h[1]); continue; }
    if (!inRisk) continue;
    const m = l.match(/^\s*[-*+]\s+\**(.+?)\**\s*:\s*(MATCH|NO)\b\s*[:\-–—]?\s*(.*)$/i);
    if (m) judged.set(m[1].trim().toLowerCase(), { match: m[2].toUpperCase() === 'MATCH', reason: m[3].trim() });
  }
  const judgmentMatches = [];
  for (const rule of ruleNames) {
    const j = judged.get(rule.toLowerCase());
    if (!j) judgmentMatches.push({ rule, reason: 'The design-reviewer gave no judgment for this rule, so it is treated as a match.' });
    else if (j.match) judgmentMatches.push({ rule, reason: j.reason || 'Matched by the design-reviewer.' });
  }
  const problems = [];
  if (verdict === 'PASS' && blocking.length) problems.push('VERDICT is PASS but there are [blocking] findings; treated as FAIL.');
  return { verdict: problems.length ? 'FAIL' : verdict, blocking, judgmentMatches, problems };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const [reviewFile, riskFile] = args._;
  try {
    if (!reviewFile || !riskFile) fail('Usage: gate.cjs <review-k.md> <risk.json> [--out <risk-gate.json>]');
    const risk = JSON.parse(fs.readFileSync(riskFile, 'utf8'));
    const review = parseReview(fs.readFileSync(reviewFile, 'utf8'), loadRules().map((r) => r.name));
    const matches = risk.matches || [];
    const gate = { matches, judgmentMatches: review.judgmentMatches };
    if (args.out) fs.writeFileSync(args.out, JSON.stringify(gate, null, 2));
    out({ ok: true, verdict: review.verdict, blocking: review.blocking, problems: review.problems, ...gate, risky: matches.length + review.judgmentMatches.length > 0 });
  } catch (e) {
    fail(e.message);
  }
}

module.exports = { parseReview };

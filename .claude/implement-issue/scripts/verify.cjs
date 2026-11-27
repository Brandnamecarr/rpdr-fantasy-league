#!/usr/bin/env node
// Build, lint and test a worktree and judge it against main.
//   node verify.cjs --cwd <worktree> [--base origin/main] [--baseline <json>] [--plan <plan.md>] [--out <json>]
// Fails on: build failure; a lint error or failing test that main doesn't have (any at all when the
// repo is "strict" in config.json); fewer tests than main; a new .skip/.only.
// Also reports (without failing): files not in the plan, removed assertions in existing tests, and
// dependency changes, for the PR body.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadConfig, git, mergeBase, repoInfo, worktreeRoot: wtRoot, normPath, parseFileList, out, parseArgs, fail } = require('./lib.cjs');

// Bump when the baseline format or lint key changes, so cached baselines are rebuilt.
const BASELINE_VERSION = 2;
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.claude']);

// ---------- pure helpers ----------

function relTo(root, p) {
  const abs = path.resolve(p);
  const rel = path.relative(root, abs);
  return normPath(rel.startsWith('..') ? p : rel);
}

// First line of a lint message, with absolute paths and positions removed. Some rules (the React
// Compiler's) embed the file's absolute path and a code frame, which differ between worktrees.
function lintMessage(message) {
  return String(message || '').split(/\r?\n/)[0]
    .replace(/(?:[A-Za-z]:)?[\\/][^\s:]*[\\/][^\s:]+(?::\d+){0,2}/g, '<path>')
    .trim();
}

// {"file|rule|message": count}. Line numbers are left out so moved code isn't "new".
function parseLint(results, root) {
  const counts = {};
  for (const f of results || []) {
    for (const m of f.messages || []) {
      if (m.severity !== 2) continue;
      const key = `${relTo(root, f.filePath)}|${m.ruleId || 'fatal'}|${lintMessage(m.message)}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

// Jest --json and Vitest --reporter=json share this shape.
function parseTests(report, root) {
  const failing = [];
  let total = 0;
  for (const s of (report && report.testResults) || []) {
    const file = relTo(root, s.name || s.testFilePath || '');
    const asserts = s.assertionResults || [];
    total += asserts.length;
    for (const a of asserts) if (a.status === 'failed') failing.push(`${file} > ${a.fullName || a.title}`);
    if (s.status === 'failed' && !asserts.some((a) => a.status === 'failed')) failing.push(`${file} > (test file failed to run)`);
  }
  return { failing, total: report && typeof report.numTotalTests === 'number' ? report.numTotalTests : total };
}

const TEST_RE = /\b(?:it|test)\s*(?:\.\s*\w+\s*)*\(/g;
const SKIP_RE = /\b(?:it|test|describe)\s*\.\s*(?:skip|only)\s*\(|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(/g;

function staticCounts(files) {
  let tests = 0;
  let skips = 0;
  for (const f of files) {
    tests += (f.text.match(TEST_RE) || []).length;
    skips += (f.text.match(SKIP_RE) || []).length;
  }
  return { tests, skips };
}

function compare(baseline, current, { strict }) {
  const failures = [...(current.errors || [])];
  if (!current.build.ok) failures.push('Build failed.');
  if (current.lint) {
    for (const [key, n] of Object.entries(current.lint)) {
      const base = strict ? 0 : ((baseline.lint || {})[key] || 0);
      if (n > base) failures.push(`New lint error: ${key.replace(/\|/g, ' | ')}${base ? ` (${n} now, ${base} on main)` : ''}`);
    }
  }
  if (current.tests && !current.tests.skipped) {
    const known = new Set(strict ? [] : (baseline.failing || []));
    for (const id of current.tests.failing) if (!known.has(id)) failures.push(`Failing test: ${id}`);
  }
  if (current.staticTests < baseline.staticTests) failures.push(`Test count dropped: ${current.staticTests} tests now, ${baseline.staticTests} on main.`);
  if (current.skips > baseline.skips) failures.push(`New .skip/.only/xit: ${current.skips} now, ${baseline.skips} on main.`);
  return { ok: failures.length === 0, failures };
}

// Lines removed from existing tests that held an assertion.
function removedAssertions(diffText) {
  const found = [];
  let file = null;
  for (const line of String(diffText || '').split(/\r?\n/)) {
    const m = line.match(/^--- a\/(.+)$/);
    if (m) { file = m[1]; continue; }
    if (line.startsWith('--- ')) { file = null; continue; }
    if (file && line.startsWith('-') && !line.startsWith('---') && /\bexpect\s*\(|\bassert\b/.test(line)) {
      found.push({ file, line: line.slice(1).trim() });
    }
  }
  return found;
}

function depChanges(basePkg, curPkg) {
  const changes = [];
  for (const group of ['dependencies', 'devDependencies']) {
    const a = (basePkg && basePkg[group]) || {};
    const b = (curPkg && curPkg[group]) || {};
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[name] === b[name]) continue;
      changes.push({ group, name, from: a[name] || null, to: b[name] || null });
    }
  }
  return changes;
}

function unplannedFiles(changed, planned, testPattern) {
  const plan = new Set(planned.map(normPath));
  const testRe = new RegExp(testPattern);
  return changed.map(normPath).filter((f) => !plan.has(f) && !testRe.test(f) && !/(^|\/)package(-lock)?\.json$/.test(f));
}

// ---------- side effects ----------

function sh(cmd, cwd) {
  const r = spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const text = `${r.stdout || ''}${r.stderr || ''}`;
  return { ok: r.status === 0, status: r.status, tail: text.split(/\r?\n/).slice(-40).join('\n') };
}

function walk(dir, root, re, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, root, re, acc);
    else if (re.test(normPath(path.relative(root, p)))) acc.push({ path: normPath(path.relative(root, p)), text: fs.readFileSync(p, 'utf8') });
  }
  return acc;
}

function testFilesAtRef(ref, cwd, re) {
  return git(['ls-tree', '-r', '--name-only', ref], cwd).split(/\r?\n/)
    .filter((f) => f && re.test(f) && !f.split('/').some((s) => IGNORE_DIRS.has(s)))
    .map((f) => ({ path: f, text: git(['show', `${ref}:${f}`], cwd) }));
}

function setup(cfg, cwd, base, log) {
  const lockChanged = (() => {
    const stamp = path.join(cwd, 'node_modules', '.package-lock.json');
    if (!fs.existsSync(stamp)) return true;
    const lock = path.join(cwd, 'package-lock.json');
    return fs.existsSync(lock) && fs.statSync(lock).mtimeMs > fs.statSync(stamp).mtimeMs;
  })();
  for (const step of cfg.setup) {
    if (step === 'npm ci' && !lockChanged) continue;
    const r = sh(step, cwd);
    log.push({ step, ok: r.ok });
    if (!r.ok) return `Setup step \`${step}\` failed:\n${r.tail}`;
  }
  return null;
}

function runChecks(cfg, cwd, tmpDir) {
  const errors = [];
  const build = sh(cfg.build, cwd);
  let lint = null;
  if (cfg.lintJson) {
    const file = path.join(tmpDir, `lint-${process.pid}-${Date.now()}.json`);
    const r = sh(cfg.lintJson.replace('{out}', `"${file}"`), cwd);
    if (fs.existsSync(file)) lint = parseLint(JSON.parse(fs.readFileSync(file, 'utf8')), cwd);
    else errors.push(`Lint did not produce a report:\n${r.tail}`);
  }
  let tests;
  const testRe = new RegExp(cfg.testFilePattern);
  const hasTests = !cfg.testDir || (fs.existsSync(path.join(cwd, cfg.testDir))
    && walk(path.join(cwd, cfg.testDir), cwd, testRe).length > 0);
  if (!hasTests) tests = { skipped: true, failing: [], total: 0 };
  else {
    const file = path.join(tmpDir, `tests-${process.pid}-${Date.now()}.json`);
    const r = sh(cfg.testJson.replace('{out}', `"${file}"`), cwd);
    if (fs.existsSync(file)) tests = { skipped: false, ...parseTests(JSON.parse(fs.readFileSync(file, 'utf8')), cwd) };
    else { errors.push(`The test runner did not produce a report:\n${r.tail}`); tests = { skipped: false, failing: [], total: 0 }; }
  }
  return { build: { ok: build.ok, tail: build.ok ? '' : build.tail }, lint, tests, errors };
}

function makeBaseline(cfg, repo, cwd, base, worktreeRoot) {
  const sha = git(['rev-parse', base], cwd);
  const re = new RegExp(cfg.testFilePattern);
  const counts = staticCounts(testFilesAtRef(base, cwd, re));
  const baseline = { version: BASELINE_VERSION, base, sha, staticTests: counts.tests, skips: counts.skips, lint: null, failing: [] };
  if (cfg.strict) return baseline;
  const dir = path.join(worktreeRoot, `${repo}-baseline-${sha.slice(0, 8)}`);
  if (!fs.existsSync(dir)) git(['worktree', 'add', '--detach', dir, sha], cwd);
  try {
    const log = [];
    const err = setup(cfg, dir, base, log);
    if (err) throw new Error(`Could not build the baseline from ${base}: ${err}`);
    const r = runChecks(cfg, dir, os.tmpdir());
    baseline.lint = r.lint || {};
    baseline.failing = r.tests.failing;
    baseline.buildOk = r.build.ok;
  } finally {
    try { git(['worktree', 'remove', '--force', dir], cwd); } catch { /* leave it for manual cleanup */ }
  }
  return baseline;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const cwd = path.resolve(args.cwd || process.cwd());
  const baseRef = args.base || 'origin/main';
  try {
    // Judge the branch against where it started, not wherever origin/main is now.
    const base = mergeBase(cwd, baseRef);
    const conf = loadConfig();
    const { repo } = repoInfo(cwd);
    const cfg = conf.repos[repo];
    if (!cfg) fail(`No config for ${repo} in config.json.`);
    const worktreeRoot = wtRoot(cwd);
    fs.mkdirSync(worktreeRoot, { recursive: true });

    const baseSha = git(['rev-parse', base], cwd);
    let baseline = null;
    if (args.baseline && fs.existsSync(args.baseline)) {
      const cached = JSON.parse(fs.readFileSync(args.baseline, 'utf8'));
      if (cached.sha === baseSha && cached.version === BASELINE_VERSION) baseline = cached;
    }
    if (!baseline) {
      baseline = makeBaseline(cfg, repo, cwd, base, worktreeRoot);
      if (args.baseline) { fs.mkdirSync(path.dirname(args.baseline), { recursive: true }); fs.writeFileSync(args.baseline, JSON.stringify(baseline, null, 2)); }
    }

    const log = [];
    const setupErr = setup(cfg, cwd, base, log);
    const checks = setupErr ? { build: { ok: false, tail: setupErr }, lint: null, tests: { skipped: true, failing: [] }, errors: [setupErr] } : runChecks(cfg, cwd, os.tmpdir());
    const counts = staticCounts(walk(cwd, cwd, new RegExp(cfg.testFilePattern)));
    const current = { ...checks, staticTests: counts.tests, skips: counts.skips };
    const verdict = compare(baseline, current, { strict: cfg.strict });

    const changed = [...new Set([
      ...git(['diff', '--name-only', base], cwd).split(/\r?\n/),
      ...git(['ls-files', '--others', '--exclude-standard'], cwd).split(/\r?\n/),
    ].filter(Boolean))];
    const planned = args.plan && fs.existsSync(args.plan) ? parseFileList(fs.readFileSync(args.plan, 'utf8'), repo) : null;
    const basePkg = (() => { try { return JSON.parse(git(['show', `${base}:package.json`], cwd)); } catch { return null; } })();
    const curPkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));

    const result = {
      ok: verdict.ok,
      repo,
      base,
      strict: cfg.strict,
      failures: verdict.failures,
      build: current.build,
      tests: { skipped: current.tests.skipped, failing: current.tests.failing, total: current.tests.total, staticTests: current.staticTests, mainStaticTests: baseline.staticTests },
      lintErrors: current.lint ? Object.values(current.lint).reduce((a, b) => a + b, 0) : null,
      changedFiles: changed,
      unplanned: planned ? unplannedFiles(changed, planned, cfg.testFilePattern) : null,
      changedAssertions: (() => {
        const tests = changed.filter((f) => new RegExp(cfg.testFilePattern).test(f));
        return tests.length ? removedAssertions(git(['diff', base, '--', ...tests], cwd)) : [];
      })(),
      dependencies: depChanges(basePkg, curPkg),
      setup: log,
    };
    if (args.out) { fs.mkdirSync(path.dirname(args.out), { recursive: true }); fs.writeFileSync(args.out, JSON.stringify(result, null, 2)); }
    out(result);
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    fail(e.stderr ? String(e.stderr).trim() : e.message);
  }
}

module.exports = { lintMessage, parseLint, parseTests, staticCounts, compare, removedAssertions, depChanges, unplannedFiles };

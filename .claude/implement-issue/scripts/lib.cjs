// Shared helpers for the /implement-issue pipeline scripts.
// This file is identical in rpdr-fantasy-league and rpdr-fantasy-web. Repo differences live in ../config.json.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const PIPELINE_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PIPELINE_DIR, '..', '..');

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(PIPELINE_DIR, 'config.json'), 'utf8'));
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// gh is not always on PATH on Windows (Git Bash); fall back to the default install location.
function ghBin() {
  if (process.env.GH_BIN) return process.env.GH_BIN;
  const win = 'C:\\Program Files\\GitHub CLI\\gh.exe';
  if (process.platform === 'win32' && fs.existsSync(win)) return win;
  return 'gh';
}

function gh(args, opts = {}) {
  return execFileSync(ghBin(), args, {
    cwd: opts.cwd,
    input: opts.input,
    encoding: 'utf8',
    stdio: [opts.input ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function ghJson(args, opts) {
  const text = gh(args, opts);
  return text ? JSON.parse(text) : null;
}

// {owner, repo, full, root} for the git checkout containing cwd.
function repoInfo(cwd = process.cwd()) {
  const root = git(['rev-parse', '--show-toplevel'], cwd);
  const url = git(['remote', 'get-url', 'origin'], cwd);
  const m = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!m) throw new Error(`origin is not a GitHub remote: ${url}`);
  return { owner: m[1], repo: m[2], full: `${m[1]}/${m[2]}`, root: path.resolve(root) };
}

// The main checkout (not a linked worktree) for any path inside the repo.
function mainRoot(cwd = process.cwd()) {
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd);
  return path.dirname(path.resolve(common));
}

// The commit the branch started from. Diffs and baselines use this, not the moving tip of
// origin/main, so work on main after the branch was cut doesn't show up as this branch's changes.
function mergeBase(cwd, ref = 'origin/main') {
  return git(['merge-base', ref, 'HEAD'], cwd);
}

// Where pipeline worktrees live: config.worktreeRoot, relative to the main checkout.
function worktreeRoot(cwd = process.cwd()) {
  return path.resolve(mainRoot(cwd), loadConfig().worktreeRoot);
}

// Repo-relative, forward slashes, no leading "./".
function normPath(p) {
  return String(p).trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

// Minimal glob: ** crosses directories, * and ? do not.
function globToRegExp(glob) {
  const g = normPath(glob);
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        i++;
        if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

// Paths listed under a "## Files" heading as "- path" or "- <repo>:path" (backticks optional).
// Returns the paths that belong to repoName (unprefixed entries belong to every repo).
function parseFileList(md, repoName) {
  const files = [];
  let inFiles = false;
  for (const line of String(md || '').split(/\r?\n/)) {
    const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h) { inFiles = /^files\b/i.test(h[1]); continue; }
    if (!inFiles) continue;
    // Accept "repo:path" and "repo: path" (the risk-rules style), with or without backticks.
    const m = line.match(/^\s*[-*+]\s+`?(?:([\w.-]{2,}):(?!\/\/)\s*)?`?([^`\s]+)`?/);
    if (!m) continue;
    let entry = m[1] ? `${m[1]}:${m[2]}` : m[2];
    const pre = entry.match(/^([\w.-]+):(?!\/\/)(.+)$/);
    if (pre && !/^[a-zA-Z]$/.test(pre[1])) {
      if (pre[1] !== repoName) continue;
      entry = pre[2];
    }
    files.push(normPath(entry));
  }
  return [...new Set(files)];
}

function sha12(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, 12);
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

// Tiny argv parser: positional args plus --flag value / --flag (boolean).
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

// --title "<t>" or --title-file <path> (first line), plus an optional --title-prefix ("WIP: ").
// Files keep quotes, backticks and $ in issue titles away from the shell.
function readTitle(args) {
  let title = args['title-file'] ? fs.readFileSync(args['title-file'], 'utf8').split(/\r?\n/)[0].trim() : args.title;
  if (title && typeof args['title-prefix'] === 'string') title = `${args['title-prefix']}${title}`;
  return typeof title === 'string' && title ? title : null;
}

function fail(message, extra = {}) {
  out({ ok: false, error: message, ...extra });
  process.exit(1);
}

// workflow-checks.cjs lives in the repo that contains the pipeline.
function workflowChecks(root = REPO_ROOT) {
  return require(path.join(root, '.github', 'scripts', 'workflow-checks.cjs'));
}

module.exports = {
  PIPELINE_DIR, REPO_ROOT, mainRoot, worktreeRoot, mergeBase, loadConfig, git, gh, ghJson, ghBin, repoInfo, normPath, globToRegExp,
  parseFileList, sha12, out, parseArgs, readTitle, fail, workflowChecks,
};

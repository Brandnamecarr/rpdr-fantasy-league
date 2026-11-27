#!/usr/bin/env node
// Creates (or resumes) the isolated worktree and branch for an issue.
//   node make-branch.cjs <N> --type <bug|feature|refactor|chore> --title "<issue title>" [--cwd <repo>]
// Branch: <type>/<N>-<slug> from a fresh origin/main. Worktree: <worktreeRoot>/<repo>-<N>.
// If a remote branch for issue N already exists it is reused, but only when every commit on it
// carries the pipeline trailer (so the pipeline never builds on someone else's work).
// Prints {ok, branch, path, resumed}.
'use strict';
const fs = require('fs');
const path = require('path');
const { loadConfig, git, repoInfo, mainRoot, worktreeRoot, out, parseArgs, readTitle, fail } = require('./lib.cjs');

function slugify(title) {
  const words = String(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  let slug = '';
  for (const w of words) {
    const next = slug ? `${slug}-${w}` : w;
    if (next.length > 40) break;
    slug = next;
  }
  return slug || 'work';
}

function branchName(type, n, title) {
  return `${type}/${n}-${slugify(title)}`;
}

function foreignCommits(commits, trailer) {
  return commits.filter((c) => !String(c.body).includes(trailer));
}

function commitsOn(ref, cwd) {
  const raw = git(['log', `origin/main..${ref}`, '--format=%H%x00%B%x1e'], cwd);
  return raw.split('\x1e').map((s) => s.trim()).filter(Boolean).map((s) => {
    const [sha, body] = s.split('\x00');
    return { sha, body: body || '' };
  });
}

function remoteBranchFor(n, cwd) {
  const heads = git(['ls-remote', '--heads', 'origin'], cwd).split(/\r?\n/)
    .map((l) => (l.split('\t')[1] || '').replace('refs/heads/', ''))
    .filter((b) => new RegExp(`^[\\w-]+/${n}-`).test(b));
  return heads[0] || null;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  args.title = readTitle(args);
  const n = args._[0];
  const cwd = path.resolve(args.cwd || process.cwd());
  try {
    if (!/^\d+$/.test(n || '') || !args.type || !args.title) fail('Usage: make-branch.cjs <N> --type <type> (--title "<title>" | --title-file <path>) [--title-prefix "WIP: "]');
    const cfg = loadConfig();
    const root = mainRoot(cwd);
    const { repo } = repoInfo(root);
    git(['fetch', 'origin', '--prune'], root);

    const existing = remoteBranchFor(n, root);
    const branch = existing || branchName(args.type, n, args.title);
    const wt = path.join(worktreeRoot(root), `${repo}-${n}`);

    if (existing) {
      const foreign = foreignCommits(commitsOn(`origin/${existing}`, root), cfg.commitTrailer);
      if (foreign.length) {
        fail(`Branch ${existing} has ${foreign.length} commit(s) not made by the pipeline. The owner must decide what to do with it.`, { branch: existing, foreign: foreign.map((c) => c.sha) });
      }
    }

    if (fs.existsSync(wt)) {
      const current = git(['rev-parse', '--abbrev-ref', 'HEAD'], wt);
      if (current !== branch) fail(`Worktree ${wt} exists on ${current}, not ${branch}.`, { path: wt });
      out({ ok: true, branch, path: wt, resumed: true });
      process.exit(0);
    }

    fs.mkdirSync(path.dirname(wt), { recursive: true });
    const localExists = (() => { try { git(['rev-parse', '--verify', `refs/heads/${branch}`], root); return true; } catch { return false; } })();
    if (existing) {
      if (localExists) git(['worktree', 'add', wt, branch], root);
      else git(['worktree', 'add', '--no-track', '-b', branch, wt, `origin/${existing}`], root);
      git(['merge', '--ff-only', `origin/${existing}`], wt);
    } else {
      if (localExists) fail(`Local branch ${branch} exists but was never pushed. The owner must push or delete it first.`, { branch });
      // --no-track: the new branch must not track origin/main, so a bare `git push` can't target main.
      git(['worktree', 'add', '--no-track', '-b', branch, wt, 'origin/main'], root);
    }
    out({ ok: true, branch, path: wt, resumed: Boolean(existing) });
  } catch (e) {
    fail(e.stderr ? String(e.stderr).trim() : e.message);
  }
}

module.exports = { slugify, branchName, foreignCommits };

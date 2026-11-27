# /implement-issue Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Claude Code pipeline, `/implement-issue <N>`, that takes a `ready-for-dev` issue to an open PR. It runs designer, design-reviewer, a risk gate, planner, implementer, tester and pr-author, with fixed scripts in between.

**Architecture:** An orchestrator skill (`.claude/skills/implement-issue/SKILL.md`) calls six subagents (`.claude/agents/*.md`) and dependency-free Node scripts (`.claude/implement-issue/scripts/*.cjs`). The scripts hold everything that must come out the same every run: ready check, risk matching, worktree and branch, verify against baseline, state on GitHub, opening the PR, and the guard hook. GitHub (the issue comments, label timeline and branch) holds run state.

**Tech Stack:** Node 20+ CommonJS, using only built-ins: `node:test`, `child_process`, `crypto`. The `gh` CLI, git worktrees, and Claude Code subagents, skills, settings and hooks.

**Spec:** `docs/superpowers/specs/2026-11-26-implement-issue-pipeline-design.md`

## Global Constraints

- Everything under `.claude/implement-issue/`, `.claude/agents/` and `.claude/skills/implement-issue/` is byte-identical in league and web. Repo differences go in `config.json`, keyed by repo name.
- No npm dependencies for the scripts. They run with `node` alone on Node 20.
- Model `claude-opus-5-5` for every agent. Effort: designer `xhigh`, design-reviewer `xhigh`, planner `high`, implementer `medium`, tester `high`, pr-author `low`.
- Limits: 2 design revision rounds, 3 implementer–tester loops.
- Owner-only labels: `ready-for-dev`, `skip-issue-check`, `design-approved`. Agents never add them.
- Never push to `main`, force-push, merge, or delete remote branches.
- Commits carry the trailer `Pipeline-Run: implement-issue` and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Design comment marker: `<!-- implement-issue:design sha=<12-hex> -->`. Status comment marker: `<!-- implement-issue:status -->`.
- Worktrees: `<repo parent>/.worktrees/<repo>-<N>`.
- Dependencies may be added or upgraded with no gate.

## Review Focus

1. A forbidden command hidden inside a compound command, or behind `git -C <dir> push`, is still blocked by the guard (Task 2 tests).
2. `design-approved` added **before** the latest design comment doesn't count as approval (Task 4 tests).
3. Paths on Windows (backslashes) still match the risk rules (Task 3 tests normalize `\` to `/`).
4. Web lint errors that only moved line numbers aren't counted as new (Task 5: the lint key is file + rule + message, no line).
5. An existing remote branch with commits that lack the pipeline trailer stops `make-branch` instead of being reused (Task 6 tests).

---

### Task 1: Shared lib and config
**Files:** Create `.claude/implement-issue/config.json` and `scripts/lib.cjs`. Test: `scripts/test/lib.check.cjs`.

**Produces:**
- `loadConfig()`: the parsed config.
- `repoInfo(cwd)`: `{owner, repo, full, root}`.
- `gh(args, opts)`: stdout string. `ghJson(args)`: the parsed result.
- `git(args, cwd)`: stdout string.
- `globToRegExp(glob)`: `RegExp`.
- `normPath(p)`: `/`-separated, relative, no leading `./`.
- `parseFileList(md, repoName)`: `string[]`, read from the `## Files` section. Entries look like `- path` or `- <repo>:path`.
- `sha12(text)`: string.
- `out(obj)`: prints JSON.

- [ ] Write the tests: `globToRegExp('src/routes/**')` matches `src/routes/a/b.ts` and not `src/app.ts`. `*` doesn't cross `/`. `parseFileList` keeps entries with no prefix plus entries prefixed with the current repo, and drops entries for other repos. `normPath('.\\src\\a.ts') === 'src/a.ts'`.
- [ ] Implement until `node .claude/implement-issue/scripts/test/run.cjs` passes.

### Task 2: Guard hook
**Files:** `scripts/guard.cjs`, `test/guard.check.cjs`, `.claude/settings.json`.

**Produces:** `checkCommand(cmd, {currentBranch}) -> {blocked: boolean, reason?: string}`. As a CLI, it reads the hook JSON from stdin, exits 2 with the reason on stderr when blocked, and exits 0 otherwise.

- [ ] Tests. **Blocked:**
  - `git push origin main`, `git push origin HEAD:main`, `git push origin +feature`, `git push -f`, `git push --force-with-lease`, `git push origin --delete x`, `git push origin :x`
  - `git -C ../x push origin main`, `npm test && git push origin main`
  - `git push` with no refspec when `currentBranch` is `main`
  - `gh pr merge 5`, `gh api -X PUT repos/o/r/pulls/5/merge`
  - `gh issue edit 3 --add-label "ready-for-dev"`, `gh pr edit 3 --add-label skip-issue-check`, `gh issue edit 3 --add-label "type: bug,design-approved"`

  **Allowed:**
  - `git push -u origin chore/1-x`
  - `gh issue edit 3 --remove-label design-approved`
  - `gh issue view 3`, `npm run build`
- [ ] Implement. Split the command on `&&`, `||`, `;`, `|` and newlines, then tokenize with quotes respected.
- [ ] `settings.json`:
  - permissions allow list for npm, npx (prisma, tsc, jest, vitest, eslint), the pipeline scripts, read-only git, `git worktree`, `git add`/`git commit`, gh read, `gh issue comment` and `gh pr create`
  - a deny list mirroring the blocked commands
  - `additionalDirectories: ["../.worktrees"]`
  - a `PreToolUse` `Bash` hook running `node "$CLAUDE_PROJECT_DIR/.claude/implement-issue/scripts/guard.cjs"`

### Task 3: Risk rules and risk-check
**Files:** `.claude/implement-issue/risk-rules.md`, `scripts/risk-check.cjs`, `test/risk.check.cjs`.

**Produces:**
- `parseRiskRules(md)` returns `[{name, paths: [{repo, glob}], judgment: string[]}]`.
- `matchRisk(rules, repoName, files)` returns `[{rule, file, glob}]`.
- CLI `risk-check.cjs --from <md>` or `--diff <base-ref> [--cwd <dir>]` prints `{repo, files, matches, judgment}`. `judgment` lists every rule's judgment lines, for the reviewer.

- [ ] Tests:
  - The real `risk-rules.md` parses into 3 rules.
  - In league, `src/routes/user.routes.ts` matches "API contract" and `prisma/schema.prisma` matches "Schema and migrations".
  - In web, `src/components/utilities/types.ts` matches "API contract".
  - `src/services/x.ts` doesn't match.
  - A web glob doesn't match in league.
- [ ] Implement.

### Task 4: State on GitHub
**Files:** `scripts/state.cjs`, `test/state.check.cjs`.

**Produces:**
- `findLatestDesign(comments)` returns `{id, sha, createdAt, body} | null`.
- `isApproved(design, events, labelsNow, label)` returns a boolean: the label is on the issue now **and** a `labeled` event for it is later than `design.createdAt`.
- `designComment(text, extra)` returns the comment body with the marker.
- CLI subcommands, each taking `<N> [--issue-repo o/r]`:
  - `status`: prints `{issue, design, approved, branch, remoteBranch, pr}`
  - `post-design <N> <design.md> [--risk <json>]`
  - `comment <N> <file>`: a status comment
  - `revoke <N>`: removes the label

- [ ] Tests:
  - The latest of two marked comments wins, and unmarked comments are ignored.
  - Approval is false when the label was added before the design, true when after, and false when the label has since been removed.
- [ ] Implement.

### Task 5: Verify
**Files:** `scripts/verify.cjs`, `test/verify.check.cjs`.

**Produces:**
- `parseLint(eslintJson, root)` returns `{"file|rule|message": count}`.
- `parseTests(jestOrVitestJson, root)` returns `{failing: string[], total: number}`. Both reporters share the shape `testResults[].name` and `assertionResults[].{fullName, status}`.
- `staticCounts(files: {path, text}[])` returns `{tests, skips}`. `tests` counts `\b(it|test)(\.each\s*\(.*?\))?\s*\(`. `skips` counts `.skip(`, `.only(`, `xit(` and `xdescribe(`.
- `compare(baseline, current, {strict})` returns `{ok, failures: string[]}`.
- CLI `verify.cjs --cwd <worktree> [--baseline <json>] [--plan <plan.md>] [--out <json>]`:
  - creates the baseline when it's missing, in a temporary worktree of `origin/main`
  - runs `npm ci` when the lockfile changed
  - runs the setup, build, lint and test commands from config
  - writes `{ok, failures, unplanned, changedAssertions, dependencies}`

- [ ] Tests. `compare`:
  - fails on build `ok: false`
  - fails on a new lint key, or a higher count for a key
  - passes when lint is the same as baseline and `strict` is false
  - fails on any lint error when `strict` is true
  - fails on a failing test that's not in the baseline
  - fails when `tests` is lower, or `skips` is higher

  `parseLint` ignores line numbers. League "no tests yet" (`testDir` missing) is a skipped test step, not a failure.
- [ ] Implement.

### Task 6: Worktree and branch
**Files:** `scripts/make-branch.cjs`, `test/steps.check.cjs`.

**Produces:**
- `branchName(type, n, title)` returns `<type>/<n>-<slug>`. The slug is lowercase a-z0-9 joined with `-`, the first 5 words, at most 40 characters.
- `foreignCommits(commits: {sha, body}[])` returns the commits without the trailer.
- CLI `make-branch.cjs <N> --type <t> --title <t>` prints `{branch, path, resumed}`.

- [ ] Tests:
  - `branchName('bug', 31, 'LeagueStandingView tests fail: mockRosters fixture missing pointUpdates')` gives `bug/31-leaguestandingview-tests-fail-mockrosters`.
  - `foreignCommits` flags a body without `Pipeline-Run: implement-issue`.
- [ ] Implement:
  - `git fetch origin`.
  - If the remote branch exists and has no foreign commits, check it out in a worktree.
  - If it has foreign commits, exit 1.
  - Otherwise, `git worktree add -b <branch> <path> origin/main`.
  - Reuse an existing worktree path for the same branch.

### Task 7: Open PR
**Files:** `scripts/open-pr.cjs`, `test/steps.check.cjs`.

**Produces:**
- `commitMessage(title, n, issueRepo)` returns a string with both trailers.
- `validatePr(body, repo)` returns problems: `checkPrBody` plus "no linked issue" from `.github/scripts/workflow-checks.cjs`.
- CLI `open-pr.cjs --cwd <wt> --issue <N> --title <t> [--body <md>] [--push-only] [--issue-repo o/r]`:
  - refuses on `main` or `master`
  - runs `git add -A` and commits if anything changed
  - runs `git push -u origin <branch>`
  - creates the PR, or reports the PR that's already open

- [ ] Tests:
  - The commit message has both trailers.
  - `validatePr` flags a missing `Closes`, an empty Proof of Testing, and `Relates to` used alone.
- [ ] Implement.

### Task 8: Ready check
**Files:** `scripts/ready-check.cjs`, `test/steps.check.cjs`.

**Produces:** `evaluateReady(issue)` returns `{ok, problems, type}`. It needs state `OPEN`, the `ready-for-dev` label, and `checkReady` to pass. `type` comes from the `type:` label. The CLI takes `<N> [--issue-repo]`.

- [ ] Tests:
  - An issue that's closed, missing the label, or failing `checkReady` gives `ok: false`.
  - A good issue gives `type: 'bug'`.
- [ ] Implement.

### Task 9: Agents and orchestrator skill
**Files:** `.claude/agents/{designer,design-reviewer,planner,implementer,tester,pr-author}.md` and `.claude/skills/implement-issue/SKILL.md`.

- [ ] Each agent: frontmatter with `name`, `description`, `tools`, `model: claude-opus-5-5`, `effort` and `maxTurns`. The prompt defines inputs (paths given by the skill), the exact output file and format, and hard rules.
- [ ] SKILL.md: the step order, the inputs and outputs for each step, the stop and comment rule, the resume table, the cross-repo flow and the limits.
- [ ] Check that frontmatter parses: a test reads every agent file and checks the required keys and effort values.

### Task 10: Docs, labels, sync
- [ ] `.gitignore` gains `.claude/implement-issue/runs/`.
- [ ] `docs/workflow.md`: an `/implement-issue` section, `design-approved` added to the labels table and agent rules, and `guard` added to Enforcement. Keep it identical in all three repos.
- [ ] `CLAUDE.md` (league and web): one line pointing to `/implement-issue`.
- [ ] Create the `design-approved` label in league, web and iOS.
- [ ] Copy everything to web and check it's byte-identical. Run `node --test` in both.
- [ ] Commit, push, and open stacked PRs. The iOS `workflow.md` sync goes in its own PR.

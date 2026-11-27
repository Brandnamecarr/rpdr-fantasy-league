# `/implement-issue`: agent pipeline from ready issue to PR

Date: 2026-11-26
Status: approved by owner 2026-11-26

**Dependencies (owner decision):**
- The implementer and tester may add or upgrade npm packages (`npm install <pkg>`, `npm install -D <pkg>`, `npm update <pkg>`) with **no** risk gate.
- `package.json` and `package-lock.json` are not risk rules.
- After any lockfile change, `verify.cjs` runs `npm ci` before building.
- Every added or upgraded package is listed in the PR's What Changed, with its version.
Repos: `rpdr-fantasy-league`, `rpdr-fantasy-web` (identical tooling in both). iOS is out of scope.

## Intent

The owner wants an agent-driven workflow. The owner defines work as issues and reviews PRs. Agents do everything in between: they design the change, plan it, branch, implement, test and open the PR.

This design covers those development agents only. Starting them automatically when `ready-for-dev` is added is issue #130. Fixing CI failures and responding to review comments is #131. Both come later, and each only needs to call this pipeline.

The owner cares most that **designs are right and checked before code gets written**. A wrong approach that reaches the PR wastes a whole implementation.

The setup should be reusable on other projects later, so project-specific knowledge belongs in config and docs, not in agent prompts.

## Goals

1. `/implement-issue <N>`, run in league or web, takes an issue labeled `ready-for-dev` to an open PR with no manual steps. The one exception is the risk gate below.
2. Every design is checked by a separate reviewer agent against the issue, the repo docs and the actual code before anything is implemented.
3. Risky designs pause for owner approval. The owner can edit the risk rules without touching agent prompts.
4. Every acceptance criterion in the issue has a test or a recorded check, and the PR's Proof of Testing shows it.
5. Identical files in league and web, kept in sync the same way as `docs/workflow.md`.
6. Works from a local Claude Code session today. A GitHub Action (#130) can invoke the same skill later without changes to the pipeline.

## Non-goals

- The `ready-for-dev` trigger (#130) and the CI-fix and review-response loop (#131).
- iOS.
- Automated code review of the finished PR.
- Moving cards on the project board. The pipeline may try it, but a failure to move a card must not fail the run.
- Cheaper models. The owner chose Opus 5.5 for now. Haiku can be revisited once tests exist.

## Anti-goals (failure even if it "works")

- An agent pushes to `main`, force-pushes, merges, or adds `ready-for-dev`, `skip-issue-check` or `design-approved`.
- Tests get weakened to pass: existing tests deleted, skipped (`.skip`, `xit`) or loosened, or the test count goes down.
- Scope creep: changes that no acceptance criterion asks for, or refactors nobody requested.
- A risky change gets past the gate, because the implementation touched a risky file the approved design didn't mention.
- Secrets end up in issue comments, PR bodies, commits or logs.
- A run that fails silently. Every stop leaves a comment on the issue saying why and what's needed.

## Constraints (from the repos as they are today)

- **Process rules** (`docs/workflow.md`):
  - Work only on `ready-for-dev` issues.
  - Branch name `<type>/<N>-<short-description>`.
  - The PR fills in every template section (`.github/pull_request_template.md`): Title, Related Issue (`Closes #N`), What Changed, Proof of Testing.
  - `pr-checks.yml` fails PRs that don't link a `ready-for-dev` issue.
- **League `main` is protected:**
  - Changes go through PRs only, enforced for admins too.
  - Required checks: pr-checks, **Build** and **Test**.
  - Open review conversations must be resolved before merging.
- **Web `main` is unprotected** (GitHub Free, private repo). The pipeline must enforce "never push to main" itself.
- **League has no tests.**
  - Jest is configured with `roots: ['<rootDir>/src/__tests__']` and `testMatch: ['**/*.test.ts']`. That directory doesn't exist yet, so the tester creates it.
  - CI's Test job skips until a test file exists, then runs `npm test`.
- **Web already fails on `main`:** 33 lint errors (#32) and 10 failing tests (#31). The verify step judges a branch against `main`'s baseline (fail only on new failures), not against "everything passes".
- **Commands:**
  - League: `npm run build` (`npx tsc`), `npm test` (jest). `npx prisma generate` must run before building.
  - Web: `npm run build`, `npm run lint`, `npm test` (vitest).
- **Context the agents rely on:**
  - `CLAUDE.md`
  - `docs/` (README, architecture, style, contracts, gotchas, domain, data-model)
  - `docs/recipes/`
    - League: add-endpoint, add-migration, add-workflow
    - Web: add-page, add-admin-tab, add-season-assets, call-endpoint
- **Cross-repo contracts** are kept in sync by hand (`docs/contracts.md`).
  - Backend source: `src/app.ts`, `src/routes/*.routes.ts`, `src/types/api-types.ts`, the `prisma/schema.prisma` enums, and the workflow IDs in `src/workflows/`.
  - Frontend mirror: `src/components/utilities/constants.ts`, `types.ts`, and `components/Admin/WorkflowsTab.tsx`.
- **Model:** Opus 5.5 for every agent (owner decision). Effort is set per agent (below).

## Approaches considered

- **A. One skill runs every step in a single session.** Least to build. But context fills up over the run, and a mistake in one step carries forward with nothing checking it. Rejected.
- **B. Specialist subagents run by one skill, with fixed steps as scripts.** Each step gets a clean context, its own tools and its own effort level. This works locally now and from a GitHub Action later. **Chosen by the owner.**
- **C. An external Node script (Agent SDK) runs each step.** The most control, but the owner would maintain an orchestration program that mostly duplicates what Claude Code already provides. Rejected.

## Design (owner-decided parts)

### Layout (identical in both repos)

```
.claude/
  skills/implement-issue/SKILL.md      # the orchestrator: runs the steps below in order
  implement-issue/
    risk-rules.md                      # owner-editable risk rules (path globs + judgment rules)
    scripts/                           # deterministic steps (Node .cjs, like workflow-checks.cjs)
      ready-check.cjs
      risk-check.cjs
      make-branch.cjs
      verify.cjs
      open-pr.cjs
  agents/
    designer.md
    design-reviewer.md
    planner.md
    implementer.md
    tester.md
    pr-author.md
```

Run state stays local and gitignored, under `.claude/implement-issue/runs/<N>/`: `design.md`, `review-<round>.md`, `plan.md`, `verify-<n>.json`, `baseline.json`.

### Steps

1. **Ready check (script).** The issue has `ready-for-dev` and passes `checkReady` from `.github/scripts/workflow-checks.cjs`. If not, the run stops and comments on the issue.
2. **`designer`** (effort `xhigh`, read-only). Reads the issue, `CLAUDE.md`, the relevant docs and recipes, and the code. Writes `design.md` with:
   - the approach
   - a table mapping each acceptance criterion to the part of the design that satisfies it
   - every file it expects to touch
   - the risks
   - the alternatives it rejected
3. **`design-reviewer`** (effort `xhigh`, read-only, fresh context). Checks the design and returns pass or fail with numbered findings. It checks that:
   - every acceptance criterion maps to part of the design, and nothing is added beyond them
   - the design follows `docs/style.md` (in league, the layers: routes, then controllers, then services, then prisma)
   - any contract change lists both sides from `docs/contracts.md`
   - the relevant `docs/gotchas.md` traps are handled
   - every file, function and route the design names exists, or is clearly marked as new
   - it reuses existing code and recipes where they apply
   - each criterion has a planned test or check

   If the review fails, the designer revises using the findings. **At most 2 revision rounds.** If the design still fails, the run stops and comments the outstanding findings on the issue.
4. **Risk gate.**
   - `risk-check.cjs` matches the design's file list against the path rules in `risk-rules.md`.
   - The reviewer also applies the judgment rules there, for example "changes a response shape", even when no listed path is touched.
   - **If a rule matches:** the run posts the checked design on the issue, says which rules matched, and stops. The owner adds the `design-approved` label and runs `/implement-issue <N>` again. The second run finds the posted design and continues from step 5.
   - **If no rule matches:** the run continues.
   - Starting rules:
     - **API contract:**
       - League: `src/app.ts`, `src/routes/**`, `src/types/api-types.ts`, `src/workflows/**`
       - Web: `src/components/utilities/constants.ts`, `src/components/utilities/types.ts`, `src/components/Admin/WorkflowsTab.tsx`
       - Judgment: any change to a request or response shape
     - **Schema and migrations:** `prisma/schema.prisma`, `prisma/migrations/**`
     - **Auth:**
       - League: `src/util/credentials/**`
       - Web: the auth context and any login, token-storage or session code
       - Judgment: any change to who can call a route
   - Cross-repo work is **not** a risk trigger.
   - The owner edits `risk-rules.md` at any time.
5. **`planner`** (effort `high`). Turns the design into `plan.md`: ordered, file-by-file steps, plus a test case for each acceptance criterion (what it asserts, where it lives).
6. **Branch (script).** `make-branch.cjs` creates `<type>/<N>-<slug>` from a fresh `origin/main`.
   - `<type>` comes from the issue's `type:` label.
   - If the working tree isn't clean, or the branch already exists with commits not made by this pipeline, the run stops.
7. **`implementer`** (effort **`medium`**, owner decision). Follows `plan.md`.
   - It can read and edit files, and run only the repo's `npm` scripts, `npx prisma generate`, `npx tsc` and read-only `git`.
   - It doesn't commit or push. The skill does that.
8. **`tester`** (effort `high`). Writes the tests from the plan, then runs `verify.cjs`.
   - **`verify.cjs`** runs build, lint (where the repo has it) and test, then compares the results against `baseline.json`. The baseline is `main`'s results, computed once per run in a temporary `git worktree` of `origin/main`. Verify fails on:
     - any build failure
     - any lint error or failing test that `main` doesn't have
     - fewer tests than `main`
     - any new `.skip` or `.only`
   - **If verify fails:** the findings go back to the implementer, then the tester runs verify again. **At most 3 implementer–tester loops.** After that the run stops, pushes the branch, and comments on the issue (no PR).
   - The tester also checks each acceptance criterion and records how it was confirmed, for the PR.
   - Before the PR step, `risk-check.cjs` runs again on the **actual diff**. If the diff touches a risky path the design didn't list, the run stops for owner approval, even if the design itself was approved.
9. **`pr-author`** (effort `low`), then **open PR (script).**
   - `pr-author` fills in the PR template: Title, `Closes #N` (or `Closes owner/repo#N`), What Changed, and Proof of Testing built from the tester's record.
   - `open-pr.cjs` commits (Co-Authored-By line), pushes the branch and opens the PR into `main`. It **never merges** and never pushes to `main`.
   - The run ends by reporting the PR URL.

### Cross-repo issues

The issue lives in league (per `workflow.md`).
- One run designs both sides together, so the design lists both repos.
- It implements and opens the league PR first.
- Then, in `../rpdr-fantasy-web`, it implements, verifies and opens the web PR.
- Both PRs use `Closes …#N`. The web PR uses `Closes Brandnamecarr/rpdr-fantasy-league#N`, because `linkedIssues` in `workflow-checks.cjs` ignores "Relates to", so pr-checks would fail.
- The sibling repo is found at `../rpdr-fantasy-web` (or `../rpdr-fantasy-league`). The path is configurable so the #130 Action can check out both repos.
- Web-only runs also read league's `docs/contracts.md`, `domain.md` and `data-model.md` through the sibling, because web has no copies of them.
- **If only one side succeeds:** the league PR stays open and the web side stops with an issue comment. A re-run sees the open league PR and does only the web side.

### State and resume

The state that matters lives on GitHub, so a re-run works the same locally and in the #130 Action. Local `runs/<N>/` is only a cache.

- **The design comment:** marker `<!-- implement-issue:design sha=<hash> -->`. `<hash>` is a hash of the design text.
- **The branch** `<type>/<N>-<slug>` on `origin`. Its commits carry a `Pipeline-Run: implement-issue` trailer, so the scripts can tell the pipeline's commits from anyone else's.
- **Approval:**
  - `design-approved` approves the **latest** design comment only.
  - The approval counts only if the label was added after that comment was posted. The scripts check the issue's timeline events.
  - If a design is redone, the run removes `design-approved` from the issue. The owner adds it back to approve the new design.
- **Stop at the final risk check:** the run posts a new design comment that lists the extra risky files and the rules they matched, then removes `design-approved`. Re-adding the label approves the diff. The re-run continues from the pushed branch, at step 9.

What a re-run does:

| Last state | What a re-run does |
|---|---|
| Design failed review after 2 rounds | Starts a fresh design (step 2) from the current issue text, so the owner can edit the issue first. |
| Waiting at the design gate | No new label: comments that it's still waiting and stops. Valid label: continues at step 5. |
| Implementer–tester limit hit, branch pushed, no PR | Checks out the pushed branch and starts a new verify loop (step 8) with a fresh limit of 3. |
| PR already open | Reports the PR and stops. #131 handles changes after that. |

### Permissions and enforcement

Guardrails are enforced mechanically, not only stated in prompts.
- **Committed `.claude/settings.json` in each repo:**
  - An allow list for what the pipeline needs, so runs don't stop for permission prompts: `Edit`, `Write`, the repo's `npm` scripts, `npx prisma generate`, `npx tsc`, `git` (except the forbidden forms) and `gh` (read, `issue comment`, `pr create`).
  - A deny list for `git push` to `main`, `git push --force`/`-f`, `gh pr merge`, and `gh issue edit`/`gh api` calls that add `ready-for-dev`, `skip-issue-check` or `design-approved`.
- **A `PreToolUse` hook** (`.claude/implement-issue/scripts/guard.cjs`) blocks the same commands even when they're phrased in ways the deny patterns miss (for example `git push origin HEAD:main`). It applies to every agent and to the owner's own Claude sessions in these repos.
- **Per-agent tool lists** still narrow what each agent can do. For example, designer, design-reviewer and planner get no `Edit` and no `Write` outside `runs/`.

### Workspace

Runs happen in an isolated `git worktree` at `../.worktrees/<repo>-<N>`, created from `origin/main` (a sibling worktree for the other repo on cross-repo runs).
- The owner's own checkout is never switched or required to be clean.
- The skill runs `npm ci` in the worktree.
- The worktree is removed after the PR opens. It is kept when the run stops, so the owner can look at it.

### Scope and test-integrity checks

- `verify.cjs` also compares the diff's file list with `plan.md`. Files that aren't in the plan and aren't tests **don't stop the run**. They're listed under a "Not in the plan" sub-bullet in the PR's What Changed, so the owner sees them in review.
- Any change to an existing test's assertions is also listed in the PR, under Proof of Testing.
- Deleted tests, a lower test count, and new `.skip` or `.only` stay hard failures.

### Guardrails that apply to every step

- Agents never add `ready-for-dev`, `skip-issue-check` or `design-approved`. They never merge, push to `main` or force-push. The scripts refuse those operations even if asked.
- Every stop, whether from failure, the gate or a step limit, comments on the issue with the step, the reason and what the owner needs to do.
- No secret values in comments, PR bodies, logs or run state.
- The posted design comment starts with a fixed marker, `<!-- implement-issue:design -->`, so a later run can find it.

### Changes outside `.claude/`

- New label `design-approved` in league and web (also in iOS, so labels stay consistent).
- `docs/workflow.md` (all three repos, identical): describe `/implement-issue`, the risk gate, `design-approved` as owner-only, and the new rule that agents never add it.
- `CLAUDE.md` (league, web): one line pointing to `/implement-issue`.
- `.gitignore`: `.claude/implement-issue/runs/`.

## Calls made by the assistant (owner hasn't confirmed)

- Run state is kept local and gitignored. Only the design is posted on the issue, so the owner can read it and a re-run can pick it up. Design files aren't committed to the repo.
- Effort for the other agents: designer `xhigh`, design-reviewer `xhigh`, planner `high`, tester `high`, pr-author `low`. The owner set the implementer to `medium`.
- Step limits: 2 design revisions, 3 implementer–tester loops.
- Diff-based risk re-check before the PR (closes the "risky file not in the design" gap).
- Verify compares against `main`'s baseline because web already fails lint and tests on `main`. This is temporary: once web#31 and web#32 close, `verify.cjs` should require everything to pass. Make that a one-line switch (for example, `strict: true` in config), not a rewrite.
- Board moves are best-effort and outside v1's success criteria.
- The state, resume and approval model above: GitHub holds the state, and an approval is tied to the latest design comment.
- A committed `.claude/settings.json` plus a `PreToolUse` guard hook. These also apply to the owner's own Claude sessions in these repos.
- Isolated worktrees under `../.worktrees/`.
- Files not in the plan and changed assertions are flagged in the PR, not blocked.
- Cross-repo partial success: the league PR stays open, and a re-run does only the web side.

## Left to the builder

- Exact agent prompts and frontmatter: tool lists, `maxTurns`, and the model written as `claude-opus-5-5` or the `opus` alias, whichever Claude Code frontmatter accepts.
- How `verify.cjs` parses jest, vitest and eslint output to get failing test names and lint error identities.
- The structure of `risk-rules.md`, as long as the owner can read and edit it as plain text and scripts can parse the path rules.
- How the skill hands files between agents (paths passed in the Agent prompt).
- How the pipeline itself is tested, as long as it covers:
  - a small real issue in each repo reaching a PR
  - a risky issue pausing at the gate, then continuing after `design-approved`
  - a design that keeps failing review and stops after 2 rounds
  - a verify failure that gets fixed in the loop

## Delivery

Per the repo rule, this work needs its own `ready-for-dev` issue. It is filed in league with the issue-creator skill, labeled `needs-refinement`, and the owner promotes it. One PR per repo, plus an iOS PR for the `workflow.md` sync. This doc is committed to league at `docs/superpowers/specs/2026-11-26-implement-issue-pipeline-design.md` in the league PR.

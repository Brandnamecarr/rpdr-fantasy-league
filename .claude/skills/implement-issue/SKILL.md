---
name: implement-issue
description: Use when asked to implement, build, work on, pick up or start an RPDR Fantasy GitHub issue (rpdr-fantasy-league or rpdr-fantasy-web), when an issue gets ready-for-dev and should become a PR, or when /implement-issue <N> is run, including re-runs after the owner adds design-approved.
argument-hint: <issue-number> [--issue-repo owner/repo]
---

# /implement-issue

Runs the pipeline from a `ready-for-dev` issue to an open PR: design, independent design review, a risk gate, plan, worktree and branch, implement, test, then PR. The design is in `docs/superpowers/specs/2026-11-26-implement-issue-pipeline-design.md` (league).

You are the orchestrator. Run the steps below **in order**. Use the Agent tool with the named `subagent_type` for agent steps, and Bash for script steps. Don't do an agent's job yourself, and don't skip a step because the issue looks easy.

## Setup

- `ARGS` = `$ARGUMENTS`. `N` is the issue number. `--issue-repo owner/repo` is given when the issue lives in another repo (a web-side run for a league issue). Otherwise the issue repo is this repo.
- Run from the owner's checkout of `rpdr-fantasy-league` or `rpdr-fantasy-web` (the folder that contains `.claude/implement-issue/`). `S` = `node .claude/implement-issue/scripts`.
- `RUN` = the absolute path of `.claude/implement-issue/runs/<N>`. Create it. It's gitignored scratch space; GitHub holds the real state. Paths here contain spaces, so **always wrap every path in double quotes** in commands.
- `IR` = `--issue-repo <owner/repo>`. Pass it to every `ready-check`, `state` and `open-pr` call when it was given.
- Every script prints JSON. Read `ok` and the other fields; don't parse the prose.
- Never put an issue or PR title on a command line. Pass `--title-file` instead.
- Scripts that build or test (`verify.cjs`, run by the tester) can take several minutes. Give those Bash calls `timeout: 600000`.

## Stopping

Whenever a step says **STOP**:
1. Write a short message to `"RUN/stop.md"`: which step stopped, why (quote the failures), and exactly what the owner needs to do.
2. Run `S/state.cjs comment <N> "RUN/stop.md" IR`.
3. Tell the user the same thing. End the run.

Never work around a stop. In particular, never add `ready-for-dev`, `skip-issue-check` or `design-approved`, never merge, and never push to `main` or force-push. The guard hook blocks these, and trying is a bug.

## Steps

**1. Ready check.** `S/ready-check.cjs <N> IR --save "RUN"`. If `ok` is false, **STOP**, listing `problems`.
- This writes `RUN/issue.json` (number, title, body, labels, type) and `RUN/title.txt`.
- Agents read the issue from `RUN/issue.json`. They never need `gh`.

**2. Resume check.** `S/state.cjs status <N> IR`. Then use the **first** row of this table that applies:

| State | Go to |
|---|---|
| `design.waiting` is true and `approved` is false | **STOP**: still waiting for the owner to add `design-approved` to the latest design comment. |
| `pr` is set | Report the PR URL. If the design lists sibling-repo files, do the sibling side (see Cross-repo). Otherwise end. |
| `remoteBranch` is set, no PR | `S/state.cjs get-design <N> "RUN/design.md" IR`. If `RUN/plan.md` is missing, run step 5. Then step 6 (it resumes the branch), then step 8 with a **fresh** loop count, starting with the tester. |
| `design` is set (and not waiting, or approved) | `S/state.cjs get-design <N> "RUN/design.md" IR`, then step 5. |
| Anything else | Step 3. |

**3. Design and review** (at most 2 revision rounds, so 3 reviews in total).
- Spawn `designer`. Give it N, the issue repo, `RUN` (it reads `RUN/issue.json`), the repo root, and the sibling path (from `.claude/implement-issue/config.json`, `repos.<repo>.sibling`).
- For k = 1, 2, 3:
  - Run `S/risk-check.cjs --from "RUN/design.md" > "RUN/risk.json"`.
  - Spawn `design-reviewer` with N, `RUN`, k and the same paths.
  - Run `S/gate.cjs "RUN/review-<k>.md" "RUN/risk.json" --out "RUN/risk-gate.json"`. If `verdict` is `PASS`, go to step 4.
  - If k < 3, spawn `designer` again to revise, pointing it at `RUN/review-<k>.md`.
  - If k = 3 and it still fails: **STOP**, quoting gate's `blocking` findings. On a re-run the design starts fresh, so the owner can edit the issue first.

**4. Risk gate.**
- `S/state.cjs revoke <N> IR`. A new design always needs a new approval.
- `S/state.cjs post-design <N> "RUN/design.md" --risk "RUN/risk-gate.json" IR`.
- If gate's `risky` was true (path matches or the reviewer's judgment), **STOP**. The owner reviews the posted design, adds `design-approved`, and runs `/implement-issue <N>` again.

**5. Plan.** Spawn `planner` with N, `RUN` and the repo paths. If `RUN/plan.md` starts with `PLAN-BLOCKED:`, **STOP** with the reason.

**6. Worktree and branch.** `S/make-branch.cjs <N> --type <issue.type> --title-file "RUN/title.txt"`. If `ok` is false, **STOP** with the `error`. `WT` = `path`. All code changes happen in `WT`, never in the owner's checkout.

**7. Implement.** Spawn `implementer` with `WT`, `RUN`, round k = 1.

**8. Test, with a fix loop** (at most 3 implementer–tester rounds).
- For k = 1, 2, 3:
  - Spawn `tester` with `WT`, `RUN` and k. It runs `verify.cjs` and writes `RUN/testing.md` and `RUN/verify-<k>.json`.
  - If `RUN/testing.md` starts with `VERDICT: PASS` **and** `RUN/verify-<k>.json` exists with `"ok": true`, go to the diff risk check below.
  - Otherwise, if k < 3, spawn `implementer` with round k+1, pointing it at `RUN/verify-<k>.json` (if it exists) and `RUN/testing.md`.
- After round 3 still failing: `S/open-pr.cjs --cwd "<WT>" --issue <N> --title-file "RUN/title.txt" --title-prefix "WIP: " --push-only IR`, then **STOP**. Quote verify's `failures` and name the pushed branch. A re-run picks up the branch.
- **Diff risk check.** Run `S/risk-check.cjs --diff origin/main --cwd "<WT>" > "RUN/risk-diff.json"`. Collect every match whose `file` isn't in `RUN/design.md`'s `## Files` list (with or without the `<repo>:` prefix). Then:
  - **Some matches aren't covered:**
    - Add those files to `## Files` in `RUN/design.md`, marked `(added during implementation)`.
    - Write `RUN/risk-gate.json` with those matches.
    - Run `S/state.cjs revoke <N> IR`.
    - Run `S/state.cjs post-design <N> "RUN/design.md" --risk "RUN/risk-gate.json" IR`.
    - Run `S/open-pr.cjs --cwd "<WT>" --issue <N> --title-file "RUN/title.txt" --title-prefix "WIP: " --push-only IR`.
    - **STOP**: the owner approves the extra files.
  - **Every match is covered:** run `S/state.cjs status <N> IR`. If `design.waiting` is true and `approved` is false, **STOP** while waiting.

**9. PR.**
- Spawn `pr-author` with `WT`, `RUN` and N.
- `S/open-pr.cjs --cwd "<WT>" --issue <N> --title-file "RUN/pr-title.txt" --body "RUN/pr.md" IR`.
- If `ok` is false, re-run `pr-author` once with the `problems`, then try again once. If it still fails, **STOP**.
- On success: `git worktree remove "<WT>"`. Report the PR URL, the verify summary, any `unplanned` files and any `dependencies`.

## Cross-repo issues

When `RUN/design.md`'s `## Files` names files in the sibling repo:
- Steps 1–5 run once, in the repo the issue lives in (league). The design and plan cover both repos.
- Step 6: run `make-branch.cjs` a second time, with `--cwd "<sibling repo path>"`. That gives `WT_SIBLING`.
- Steps 7–8: pass both `WT` and `WT_SIBLING` to the implementer and tester. The tester verifies both.
- Step 9: open the league PR first. Then the sibling PR:
  - Run `pr-author` for the sibling, writing `RUN/pr-sibling.md` and `RUN/pr-title-sibling.txt`, with `Closes <league-owner>/<league-repo>#<N>`.
  - Run `node .claude/implement-issue/scripts/open-pr.cjs --cwd "<WT_SIBLING>" --issue <N> --issue-repo <league owner/repo> --title-file "RUN/pr-title-sibling.txt" --body "RUN/pr-sibling.md"` **from the sibling repo's checkout**, so its own scripts and config apply.
- If the league side passes but the sibling side hits the round limit: open the league PR, push the sibling branch with `--push-only`, then **STOP**, saying which side is left. A re-run from league sees the league PR open and does only the sibling side.

## Limits and cost

- 2 design revisions. 3 implementer–tester rounds. Every agent has its own `maxTurns`.
- Every agent runs Opus 5.5. A full run costs several Opus sessions, so don't re-run steps whose output already exists in `RUN/` when resuming in the same session.

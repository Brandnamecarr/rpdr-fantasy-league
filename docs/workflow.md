# Development workflow

> How work moves from idea to merged code in the RPDR Fantasy repos. These rules apply to people and AI agents alike.
> This file is identical in `rpdr-fantasy-league`, `rpdr-fantasy-web` and `rpdr-fantasy-ios-app`. Change all three together.

## The one rule

**Nothing gets worked on unless its issue is labeled `ready-for-dev`.**

No branch, no code, no PR for an issue labeled `needs-refinement` or with no readiness label. If the work you want to do has no ready issue, the next step is refining an issue, not writing code. Automation enforces this rule (see [Enforcement](#enforcement)).

## Issues

### Where to file

File the issue in the repo whose code changes. For work that spans repos (an API change plus the UI that uses it), file one issue in `rpdr-fantasy-league` and reference it from the PRs in the other repos.

### Writing an issue

Use **New issue** on GitHub. The form has two required sections:

- **Description:** what needs to happen and why, with any context, screenshots or links.
- **Acceptance Criteria:** one checkbox per testable outcome. If you can't write a checkbox for it, the issue isn't understood yet.

Issues created from the CLI or API skip the form. Use the same `### Description` and `### Acceptance Criteria` headings by hand. AI agents in `rpdr-fantasy-league` and `rpdr-fantasy-web` use the `issue-creator` skill (`.claude/skills/issue-creator/`). It writes the issue in this format, with a **Why:** justification, and validates the body and labels before creating it.

### Labels

Every issue gets exactly one readiness label, exactly one type, and at least one area.

| Group | Label | Meaning |
|---|---|---|
| Readiness | `needs-refinement` | Not ready to build: missing detail, decisions or scoping. Every new issue starts here. |
| | `ready-for-dev` | Meets the definition of ready below. Only the owner applies it. |
| Type | `type: feature` | New functionality or an enhancement |
| | `type: bug` | Something is broken |
| | `type: refactor` | Cleanup or restructuring with no behavior change |
| | `type: chore` | Maintenance, ops, research or security work with no feature change |
| | `type: epic` | Too big to build directly. Break it into smaller issues. Epics never become `ready-for-dev`. |
| Area | `area: frontend` | React web UI (`rpdr-fantasy-web`) |
| | `area: backend` | Node/Express server, database, APIs (`rpdr-fantasy-league`) |
| | `area: infra` | AWS, deployment, CI/CD, tooling |
| | `area: ios` | Swift iOS app (`rpdr-fantasy-ios-app`) |
| | `area: business` | Monetization, metrics, ads, product decisions |
| | `area: testing` | Tests, QA and security testing |
| Override | `skip-issue-check` | On a PR only: skips the linked-issue rule for housekeeping (docs, templates, config). Owner-only. |

The readiness labels are mutually exclusive. Adding one removes the other automatically.

### Definition of ready

An issue can be labeled `ready-for-dev` only when all of these are true:

1. **The description** says what and why, clearly enough that someone new could start.
2. **The acceptance criteria** have at least one filled-in `- [ ]` item, and every item can be tested.
3. **There's exactly one `type:` label**, and it isn't `type: epic`.
4. **There's at least one `area:` label.**
5. **No open questions or blockers.** Design decisions are made, and any issue it depends on is done.

Automation checks 1 to 4 (whether those sections and labels exist and aren't empty). Number 5, and whether the content is actually good, is the owner's call when applying the label.

### Lifecycle and the project board

Issues appear on the **RPDR-Fantasy-League** project board automatically. The readiness labels drive the first two columns:

| Column | What it means | How an issue gets there |
|---|---|---|
| **Backlog** | Needs refinement | New issues, or `needs-refinement` added |
| **Ready** | Can be picked up | `ready-for-dev` added and the definition-of-ready check passed |
| **In progress** | Someone is building it | Move it manually when work starts |
| **In review** | A PR is open | Move it manually when the PR opens |
| **Done** | Merged and closed | Automatic when the issue closes |

## Branches and pull requests

### Branches

Branch from `main` and name the branch `<type>/<issue-number>-<short-description>`:

```
feature/95-user-metrics
bug/72-notification-center
refactor/59-logger-service-name
chore/78-security-test
```

### Pull requests

- **Open the PR into `main`.**
- **Fill in every section of the PR template:**
  - **Title**
  - **Related Issue:** `Closes #123`, or `Closes owner/repo#123` for an issue in another repo. "Closes" closes the issue automatically on merge.
  - **What Changed:** one bullet per change.
  - **Proof of Testing:** one checkbox per thing tested, with steps and results.
- **Check that the build passes before opening the PR.** See the repo's `CLAUDE.md` for the exact commands.
- **One issue per PR** where possible. Keep PRs small enough to review in one sitting.

## AI agents

AI agents (Claude Code and others) follow everything above. Specifically:

**Agents may, without asking:**
- read issues, PRs, code and the board
- create issues using the Description and Acceptance Criteria format, labeled `needs-refinement` plus one `type:` and at least one `area:` label, following the `issue-creator` skill where the repo has it
- improve an issue's description and acceptance criteria, and suggest that it's ready
- pick up an issue that is **already** labeled `ready-for-dev`: create the branch, implement, test, and open a PR that follows the template
- move the issue they're working on to **In progress** or **In review**

**Agents must not, unless the owner explicitly asks in the current conversation:**
- start work on an issue that isn't labeled `ready-for-dev`
- add `ready-for-dev` or `skip-issue-check`
- merge PRs, push directly to `main`, or force-push
- delete issues, branches or labels
- change repository settings, secrets or workflows

When asked to work on something that has no ready issue, an agent says so and offers to help refine the issue instead.

## Enforcement

GitHub Actions in each repo enforce these rules. The checks live in `.github/scripts/workflow-checks.cjs`.

| Workflow | When it runs | What it enforces |
|---|---|---|
| `sync-readiness-labels.yml` | An issue gets `ready-for-dev` or `needs-refinement` | Checks the definition of ready (1 to 4). If the check fails, it swaps the label back to `needs-refinement` and comments with what's missing. It keeps the labels mutually exclusive and moves the card between Backlog and Ready. |
| `pr-checks.yml` | A PR is opened, edited, pushed to, or relabeled | Fails the check unless the PR links an issue labeled `ready-for-dev` and fills in **What Changed** and **Proof of Testing**. The owner's `skip-issue-check` label skips the issue-link rule. So do docs PRs that `doc-sync.yml` opens. |
| `doc-sync.yml` (`rpdr-fantasy-league` and `rpdr-fantasy-web` only) | A PR merges into `main` | Claude reads the merge diff and fixes the `docs/` files it made wrong. If any doc changed, the workflow opens a PR from `docs/sync-pr-<N>` and links it on the merged PR. It skips docs-only PRs and its own PRs, keeps only edits under `docs/`, and never edits this file. |

Board sync uses the `PROJECT_TOKEN` repo secret, a classic token with the `project` scope. If board moves stop working, the token has probably expired. Generate a new one and update the secret in all three repos.

### Doc sync

Docs PRs from `doc-sync.yml` are opened by `github-actions[bot]`. Review them like any other PR: check each edit against the code, then merge or close. Nobody, the workflow included, merges them automatically. Fixing a doc in your own PR is still the rule. Doc sync catches what slips through.

Doc sync needs two things in each repo that runs it: the `ANTHROPIC_API_KEY` repo secret, and **Allow GitHub Actions to create and approve pull requests** turned on under Settings → Actions → General. Every merge that touches code costs one Claude run.

GitHub doesn't start other workflows for PRs that `github-actions[bot]` opens, so `pr-checks` first runs on a docs PR when someone pushes to its branch.

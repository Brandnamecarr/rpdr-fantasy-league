---
name: issue-creator
description: Use when creating, filing, drafting or raising a GitHub issue, bug report, task, story or ticket in any RPDR Fantasy repo (rpdr-fantasy-league, rpdr-fantasy-web, rpdr-fantasy-ios-app), including issues found while doing other work.
---

# Issue creator

Every issue an agent files must pass the definition of ready in `docs/workflow.md` the moment the owner adds `ready-for-dev`. The owner reviews it, adds the label, and work starts. So the issue has to stand alone: what to do, why it's worth doing, and how to tell it's done.

## Steps

1. **Pick the repo.** File it where the code changes. Work that spans repos goes in `rpdr-fantasy-league`.
2. **Search for duplicates.** Run `gh issue list -R <owner/repo> --state all --search "<keywords>"` with two or three keyword sets. If one exists, comment on it or update it instead of filing a new one.
3. **Investigate enough to justify it.** Find the file and line, the error, or the doc that shows the problem. Don't guess what you can check in a minute.
4. **Write the body** in the shape below, to a temp file.
5. **Pick the labels** from the table below.
6. **Validate** from the repo root: `node .claude/skills/issue-creator/check-issue.cjs <body-file> "<label>" "<label>" ...`. It runs the same readiness check as `sync-readiness-labels.yml`, plus the rules here. Fix everything it reports and run it again until it prints `OK`.
7. **Create it:** `gh issue create -R <owner/repo> --title "<title>" --body-file <body-file> --label "<label>" ...`
8. **Report back** with the issue URL, the labels, and any open questions the owner has to answer before adding `ready-for-dev`.

## Body shape

Fill in every slot. Use bold labels inside the Description, never sub-headings: the readiness check splits the body on headings, so a heading would cut the Description short.

```markdown
### Description
<What needs to happen, in one or two sentences.>

**Why:** <The justification. What breaks, who is affected, or what it blocks, with evidence: file:line, the exact error, a command and its output, or a doc link. Say what happens if nobody does this.>

**Context:** <What you found while investigating: the relevant code, related issues (#N), likely causes or approaches. Write "None." if there is nothing.>

**Open questions:** <Decisions the owner must make before work starts, as a list. Write "None." if there are none.>

### Acceptance Criteria
- [ ] <An observable, testable outcome: a command that passes, a behavior a user sees, a file that exists.>
- [ ] <One checkbox per outcome.>
```

Acceptance criteria describe the finished state, not the steps. "Root cause confirmed" and "Investigate X" aren't outcomes. Put the decision under **Open questions**, and write the result you need checked: "`npm test` passes with all 11 tests in `src/test/LeagueStandingView.test.tsx`".

## Labels

Exactly this set, every time:

| Group | Pick | Choices |
|---|---|---|
| Readiness | always `needs-refinement` | Never `ready-for-dev`: only the owner adds it. |
| Type | exactly one | `type: feature`, `type: bug`, `type: refactor`, `type: chore`. Use `type: epic` only when the work is too big for one PR. |
| Area | one or more | `area: frontend`, `area: backend`, `area: infra`, `area: ios`, `area: business`, `area: testing` |

Never add `skip-issue-check`. It goes on PRs only, and only the owner adds it.

## Common mistakes

| Mistake | Fix |
|---|---|
| Only `needs-refinement`, no type or area | The ready check rejects it. Always add one `type:` and at least one `area:` label. |
| A Description that says what but not why | Fill in **Why:** with evidence and impact. |
| "Investigate…" or "Decide…" as a checkbox | Move it to **Open questions:** and write the testable end state instead. |
| `#### Why` as a heading | Use `**Why:**`. Headings break the Description section. |
| Filing without searching | Run the duplicate search first. |

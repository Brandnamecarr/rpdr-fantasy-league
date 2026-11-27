# Risk rules for /implement-issue

When a design, or the final diff, matches any rule below, the pipeline posts the design on the issue and stops. The owner reviews it and adds the `design-approved` label, then runs `/implement-issue <N>` again to continue.

The owner can edit this file at any time.
- **Paths:** `- <repo>: <glob>`. `**` matches across folders, and `*` matches within one folder. `risk-check.cjs` checks these mechanically against the design's `## Files` list and the actual diff.
- **Judgment:** plain sentences the `design-reviewer` agent applies, for changes that no path rule catches.
- Each `## ` heading is one rule. Keep this file identical in `rpdr-fantasy-league` and `rpdr-fantasy-web`.

## API contract
Changes here must be mirrored across repos (see `docs/contracts.md` in league).

Paths:
- rpdr-fantasy-league: src/app.ts
- rpdr-fantasy-league: src/routes/**
- rpdr-fantasy-league: src/types/api-types.ts
- rpdr-fantasy-league: src/workflows/**
- rpdr-fantasy-web: src/components/utilities/constants.ts
- rpdr-fantasy-web: src/components/utilities/types.ts
- rpdr-fantasy-web: src/components/Admin/WorkflowsTab.tsx

Judgment:
- Adds, removes or renames a route, or changes a route's method or path.
- Changes a request body, response body or error body shape, including in a controller or service.
- Changes an enum value, workflow ID or workflow step name.

## Schema and migrations

Paths:
- rpdr-fantasy-league: prisma/schema.prisma
- rpdr-fantasy-league: prisma/migrations/**

Judgment:
- Adds, drops or renames a table, column or enum, or changes a column's type, nullability or default.
- Rewrites or backfills existing data.

## Auth

Paths:
- rpdr-fantasy-league: src/util/credentials/**
- rpdr-fantasy-web: src/**/AuthContext*
- rpdr-fantasy-web: src/**/*Login*
- rpdr-fantasy-web: src/**/*login*

Judgment:
- Changes who can call a route: auth middleware, admin checks, or `req.user` handling.
- Changes how passwords, tokens or sessions are created, checked, stored or expired.

# rpdr-fantasy-league

Express + Prisma + PostgreSQL backend for RPDR Fantasy. The frontend lives in the sibling repo `../rpdr-fantasy-web`.

**Start with [docs/README.md](docs/README.md).** It covers the domain, architecture, data model, API contracts, gotchas and recipes.

**Before starting any work, read [docs/workflow.md](docs/workflow.md).** Only work on issues labeled `ready-for-dev`. Never add `ready-for-dev` or `skip-issue-check` yourself, and never merge a PR unless the owner asks.

Rules that matter most:
- Layers: `routes/` → `controllers/` → `services/` → `prisma`. See [docs/style.md](docs/style.md) and follow it rather than the nearest legacy file.
- Take the caller's identity from `req.user.email`, never from the body or query. Emails are stored UPPERCASE.
- Any change to a route, response shape, enum or workflow ID must be mirrored in `rpdr-fantasy-web`. See [docs/contracts.md](docs/contracts.md).
- Never log passwords or tokens. Never commit `.env*` files except `.env.sample`.
- There are no backend tests. Check that `npm run build` passes after every change.
- If code and docs disagree, trust the code and fix the doc in the same change.

# rpdr-fantasy-league — Docs Index

> Backend API for RPDR Fantasy, a fantasy league app for RuPaul's Drag Race. Users draft queens onto teams, and those teams score points from episode results and fan votes.
> Last verified against `main` @ `62430d3` (2026-11-25). If a doc disagrees with the code, the code wins. Fix the doc in the same PR.

## Read in this order

1. [domain.md](domain.md): what franchises, seasons, leagues, rosters, brackets and surveys are, and how scoring works.
2. [architecture.md](architecture.md): request flow, auth, background jobs, deployment.
3. [data-model.md](data-model.md): tables, the implicit keys that join them, and season archiving.
4. [contracts.md](contracts.md): every route, and what must stay in sync with `rpdr-fantasy-web`.
5. [gotchas.md](gotchas.md): sharp edges. Read it before changing auth, emails, leagues or scoring.
6. [style.md](style.md): conventions for **new** code. Legacy code doesn't always follow them, so don't copy it blindly.

## Recipes (step-by-step checklists)

- [recipes/add-endpoint.md](recipes/add-endpoint.md): add a new API route, end to end.
- [recipes/add-workflow.md](recipes/add-workflow.md): add an admin-panel workflow.
- [recipes/add-migration.md](recipes/add-migration.md): change the database schema.

## Run it

```bash
cp .env.sample .env      # fill in DATABASE_URL, JWT_SECRET, ADMIN_API_KEY, ADMIN_EMAIL at minimum
npm install
npx prisma generate
npm run dev              # ts-node src/server.ts on PORT (default 3000)
```

Build with `npm run build` (output in `dist/`) and start with `npm start`. Jest is configured to read `src/__tests__/`, but that folder doesn't exist yet, so **there are no backend tests**.

## Sibling repo

The frontend is `../rpdr-fantasy-web` (React + Vite). It calls this API through URL constants in `src/components/utilities/constants.ts`. See [contracts.md](contracts.md).

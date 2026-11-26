# Recipe: Add an API Endpoint

> A checklist for adding a route end to end, backend and web. A good example to copy: `PATCH /users/displayName` (`user.routes.ts` → `user.controller.updateDisplayName` → `user.service.updateDisplayName`).

## Backend (this repo)

1. **Types.** If the endpoint has a request body, add an interface to `src/types/api-types.ts` (e.g. `UpdateDisplayNameBody`).
2. **Service.** Add `export const doThing = async (...) => {}` to `src/services/<area>.service.ts`. Prisma calls go here, and failures are thrown as string codes (`throw new Error('NOT_OWNER')`).
3. **Controller.** Add a handler to `src/controllers/<area>.controller.ts`:
   - Type it as `(req: AuthRequest<Body>, res: Response)`.
   - Take the caller's identity from `req.user!.email`, never from the body.
   - Validate the input → `400 { Error }`.
   - Call the service inside `try/catch`, mapping each error code to `403`/`404`/`409`. Anything else → `500 { Error }`.
   - Log with the `'Area.Controller.ts: fn() - ...'` prefix.
4. **Route.** Add one line to `src/routes/<area>.routes.ts` with a `// Doc:` comment. A router that uses `router.use(protect)` is already authenticated. For an admin-only route, add `protectAdmin` per route as `admin.routes.ts` does.
5. **New area?** Create `routes/`, `controllers/` and `services/` files named `<area>.*.ts`, and mount the router in `src/app.ts`.
6. **Schema change?** Follow [add-migration.md](add-migration.md) first.
7. Check it: `npm run build` must pass, then exercise the route with `npm run dev` and curl.

## Web (`rpdr-fantasy-web`)

8. Add a URL constant to `src/components/utilities/constants.ts` in the matching section: `export const DO_THING = BASE_URL + AREA_ROUTE + "doThing";`.
9. Add or adjust response types in `src/components/utilities/types.ts` to match what the backend returns.
10. Call it with `postDataToServer<Resp, Body>(CONSTANTS.DO_THING, body, token)` or `getDataFromServer<Resp>(url, token)`, where `token` comes from `useAuth()`. Admin-key routes use `adminFetch` from `components/Admin/shared.tsx`.
11. Update the route table in [../contracts.md](../contracts.md).

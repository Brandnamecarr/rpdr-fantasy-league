# Code Style (target conventions)

> How **new or touched** backend code should look. Existing code is inconsistent, and a full cleanup is planned for later. Until then: **follow this file, not the nearest legacy file.** Nothing enforces these yet; no ESLint or Prettier config exists in this repo.

## Layers

- **Routes** only map URLs to controllers and attach auth. Each route gets a one-line `// Doc:` comment giving method, path and body or query.
- **Controllers** handle `req`/`res`: they read input, validate it, call **one** service function, and map the result or error to an HTTP status. They don't use Prisma directly. (Legacy exception: `admin.controller.ts`.)
- **Services** hold business logic and Prisma calls. They never touch `req`/`res`. Use `prisma.$transaction` for writes to several tables.
- Import Prisma only from `src/db/prisma.client.ts`.

## Conventions for new code

| Topic | Do | Legacy you'll see (don't copy it) |
|---|---|---|
| Identity | `const email = req.user!.email` on `protect` routes, typed with `AuthRequest<Body>` | an `email` taken from the body or query |
| Emails | Uppercase before any lookup or compare | mixed |
| Error response | `res.status(4xx/5xx).json({ Error: 'Human readable message' })` | `{ Message }`, 404 for a hashing failure |
| Service errors | Throw a string code (`throw new Error('LEAGUE_FULL')`) and map it in the controller. Return `null` for "not found". | sentinel strings returned as values (`'ALREADY_COMPUTED'`) |
| Functions | `export const fn = async (...) => {}` | the occasional `export async function` |
| Logging | `logger.<level>('File.Layer.ts: fn() - message', { context })`, e.g. `'League.Service.ts: createLeague() - created'`. Never log passwords, tokens or `Authorization` headers. | inconsistent prefix casing (`leagueOps.service.ts:`, `SurveyScheduler:`), `console.log` |
| Quotes / indent | single quotes, 4-space indent, semicolons | mixed quotes |
| Types | HTTP shapes go in `types/api-types.ts`, internal shapes in `types/domain-types.ts`, and Prisma types come straight from `@prisma/client` | `any` bodies |
| New URLs | `camelCase` verb-noun path under the right prefix. Use `GET` for reads and `POST`/`PATCH` for writes. | reads done with `POST` |
| Docs | A short `// Doc:` comment above each exported function: what it does, the error codes it throws, and any non-obvious side effects. Don't guess routes; old `Route: Likely …` lines are wrong. | long `Args:` lists that repeat the signature |

## When you touch a legacy file

Fix style only in the lines you're already changing. Don't reformat the whole file in a feature PR; the formatting pass will come as its own commit.

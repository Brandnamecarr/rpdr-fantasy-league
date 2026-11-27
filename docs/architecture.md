# Architecture

> How the server is put together. Source of truth: `src/app.ts`, `src/server.ts`, `src/util/credentials/TokenManager.ts`, `Dockerfile`, `task-definition.json`.

## Stack

Node 20, Express 5, TypeScript (strict, CommonJS), Prisma 5 → PostgreSQL. Auth uses `jsonwebtoken` and `bcrypt`. Other libraries: AWS SDK v3 for S3, `nodemailer` for SMTP, and `cheerio` for scraping the fandom wiki.

## Layout

```
src/
  server.ts            # entry: loads dotenv, app.listen, starts surveyScheduler
  app.ts               # middleware + mounts every router
  routes/X.routes.ts   # URL -> controller, plus auth middleware. No logic.
  controllers/X.controller.ts  # reads req, validates, maps errors -> HTTP status, calls service
  services/X.service.ts        # business logic + Prisma queries. No req/res.
  workflows/           # admin-run jobs (see recipes/add-workflow.md)
  db/prisma.client.ts  # the single PrismaClient instance; always import this
  types/api-types.ts   # HTTP request/response shapes
  types/domain-types.ts# internal shapes (token payload, workflows, logs)
  enums/enums.ts       # scoring point values, LogLevel
  util/{aws,credentials,email,logger,server}/  # S3, JWT/bcrypt, SMTP, logger, scheduler
```

## Request flow

`app.ts` → `routes/<x>.routes.ts` → auth middleware → `controllers/<x>.controller.ts` → `services/<x>.service.ts` → `prisma`.

A request passes through these middlewares in order:
1. `trust proxy` (so `req.ip` is the real client IP behind the ALB).
2. CORS, restricted to the `CORS_ORIGIN` origin and to `GET`/`POST`/`PATCH`.
3. A raw body parser for `/subscription/webhook` only.
4. `express.json()`.

Routes outside any router:
- `GET /health`: the ALB health check.
- `GET /track/ping`: an anonymous visit beacon. It upserts a `SiteVisit` row keyed by `(ip, date)`.

Services signal business-rule failures by **throwing string error codes** (e.g. `'LEAGUE_FULL'`, `'NOT_OWNER'`), and the controller maps each code to a 4xx response. "Not found" usually comes back as `null`.

## Auth (four separate mechanisms)

| Mechanism | How | Used on |
|---|---|---|
| `protect` | `Authorization: Bearer <JWT>`. The JWT is signed with `JWT_SECRET`, expires after **1h**, and carries `{id, email}`. The decoded payload goes on `req.user` (`AuthRequest`). | Most routers, via `router.use(protect)` |
| `protectAdmin` | `Authorization: Bearer <ADMIN_API_KEY>`. A static key that never expires. | `/admin/*`, `/users/setAdmin` |
| `isAdminEmail()` | Checks the email against the `ADMIN_EMAIL` comma-separated allowlist, case-insensitively. | Admin-only checks inside notification handlers. `GET /admin/getJwt` mints a JWT for the first allowlisted user. |
| `User.isAdmin` | A database flag set through `POST /users/setAdmin`. | `updateSeason` checks it before allowing a status change to `INACTIVE`. |

**`requireAdmin`** (in `TokenManager.ts`) combines the last two: mount it after `protect`, and it lets the caller through if their JWT email is allowlisted (`isAdminEmail`) **or** their `User.isAdmin` flag is set. Otherwise it returns 403. Use it for any JWT route that changes shared data (scoring, surveys, queens, seasons) or lists users. The admin panel's `/admin/getJwt` token passes it.

The JWT comes from `POST /users/auth` (log in) or `POST /users/create` (sign up). There is **no refresh token**: after an hour the user has to log in again.

The admin panel holds the admin key and calls `GET /admin/getJwt` to get a JWT, which it uses for routes that only accept `protect`.

## Background work (in-process, single instance)

- **Survey scheduler** (`util/server/surveyScheduler.ts`): a `setInterval` that runs every 10 minutes and computes fan surveys that have closed.
- **Workflows** (`services/workflow.service.ts`): when an admin triggers one with `POST /admin/workflows/execute`, it runs in the background. Its steps run in order, and the first failure stops the rest. Live status lives in an **in-memory Map** that's cleared 10 minutes after the workflow finishes. The admin UI polls `GET /admin/workflows/status/:executionId`, and only the final result is written to `WorkflowExecutionResults`.

Both of these assume **one running server**. A second Fargate task would run its own scheduler and wouldn't see the first task's workflow status.

## Logging

`util/logger/LoggerImpl.ts` exports a singleton `logger` with `error/warn/info/debug(message, context?)`. It writes JSON lines to stdout (which reaches CloudWatch via awslogs) and to `logs/app.log` (rotated to `.old`). The admin Logs tab reads that file through `log.service.ts`, so it shows **only the current container's** logs. Set the level with `LOG_LEVEL`.

## Deployment

`Dockerfile` builds in two stages: `npm ci` and `tsc`, then a production-only image. `entrypoint.sh` runs `prisma migrate deploy` and then `node dist/server.js`.

It runs on AWS ECS Fargate behind an ALB. `task-definition.json` injects `DATABASE_URL` and `JWT_SECRET` as secrets and sets `NODE_ENV`, `PORT` and `CORS_ORIGIN`. Other services:
- S3 holds database backups (`database_backup/<timestamp>/dump.json`) and look images.
- SMTP sends email.

`JWT_SECRET` is required when `NODE_ENV=production`; the server throws at startup without it.

Env vars are listed in `.env.sample`. Never commit a real `.env*` file; `.gitignore` allows only `.env.sample`.

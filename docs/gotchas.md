# Gotchas

> Sharp edges you can't see from any one file. Each is current as of `main` @ `62430d3`. When you fix one, delete its entry.

## Identity & auth

- **Emails are UPPERCASE in the database.** `/users/auth`, `/users/create` and the user-service lookups uppercase their input. Every other table stores emails as plain strings (`League.users`, `Roster.username`, `Notification.destination`…), so code that compares or looks up an email must compare against the uppercase value.
- **Many routes trust an email from the body or query instead of `req.user`.** `GET /league/allUserLeagues?email=…`, `POST /leagueOps/addUserToLeague {email}` and others act on whatever email they're given, so any logged-in user can act as someone else. Newer handlers (join requests, notifications, `updateSeason`) correctly use `req.user.email`. **New code must take identity from `req.user`.**
- There are **four admin mechanisms**: the admin key, the `ADMIN_EMAIL` allowlist, the `User.isAdmin` flag, and the web's `VITE_ADMIN_EMAIL`. See [architecture.md](architecture.md#auth-four-separate-mechanisms). Pick the one that matches the neighboring code, and say which one in your PR.
- JWTs expire after 1 hour and there's no refresh token. Without `JWT_SECRET`, development signs with `'testing'`; production refuses to start.
- `createUser` logs the plaintext password at `debug` level (`user.controller.ts`), `protect` logs the raw `Authorization` header at `debug`, and `verifyToken` logs the raw token at `debug` and again at `error` when verification fails. Don't run production at `LOG_LEVEL=debug`, and don't copy this pattern.

## Data

- **`League.leagueName` is globally unique**, not per season, so two seasons can't both have a league called "Werk Room".
- There are no foreign keys between leagues, rosters, queens and users; they're joined by strings. Renaming a queen or user doesn't cascade. See [data-model.md](data-model.md).
- `Roster` has no unique `(leagueName, username)` constraint, so code has to check membership before inserting. `addUserToLeague` and the join-request approval do this check inside a transaction.
- `removeUserFromLeague` removes the email from `League.users` but **leaves their `Roster` row behind** (there's a TODO in the code).
- **Archiving a season (setting it `INACTIVE`) can't be undone** and deletes that season's fan surveys for good.
- The Prisma enum `ActivityStatus` includes `UPCOMING`; the web's copy doesn't.
- **Database backups leave out some tables.** `buildDatabaseDump()` in `admin.service.ts` (used by `GET /admin/dump` and the Database Backup workflow) has a hardcoded table list that skips `Membership`, `LeagueJoinRequest`, `WorkflowExecutionResults` and `SiteVisit`. The admin Database tab's `TABLE_REGISTRY` is a separate list.

## Scoring

- `weeklyUpdate` placement points overwrite each other rather than adding up (see [domain.md](domain.md#scoring)). Rerunning it for the same episode **adds the points again**. The `EpisodeResult` upsert doesn't prevent that.
- `computeFanSurvey` can return the string `'ALREADY_COMPUTED'`, `null`, or a `Roster[]`. Callers must handle all three.
- `endOfSeasonUpdate` doesn't set the season `INACTIVE`; that's a separate admin step.

## Runtime

- Only run **one server instance**. The survey scheduler and the in-memory workflow status map are per process.
- The admin Logs tab reads the container's own `logs/app.log`. Logs from before a redeploy or from other tasks aren't there; use CloudWatch for those.
- `/subscription/webhook` must keep its `express.raw()` parser mounted **before** `express.json()` in `app.ts`.
- Stripe isn't integrated. `subscription.service.ts` mentions `.claude/plans/subscription-payment-design.md`, but **that file no longer exists**.
- Free tier: a user may own or belong to **one** league in total (`isOverFreeLeagueLimit`). Paying members are exempt, but nobody can pay yet.
- Look images live in two places: LookFinder uploads to S3 (`images/<franchise>/<season>/<episode>/`), but the web's weekly survey shows images **bundled into the web repo** (`src/components/data/queens/weekly-survey/`).
- `build_and_run.sh` runs `node dist/app.js`, which only builds the app and never calls `listen`. Use `npm start` (`dist/server.js`).

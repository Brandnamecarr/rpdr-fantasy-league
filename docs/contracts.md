# API Routes & Cross-Repo Contracts

> Everything `rpdr-fantasy-web` depends on. Nothing generates or checks these by machine: each item below is **kept in sync by hand**. When you change one side, change the other side in a PR to that repo.
> Source of truth: `src/app.ts` (mount prefixes), `src/routes/*.routes.ts` (paths and auth), `src/types/api-types.ts` (body shapes). The frontend mirror is `rpdr-fantasy-web/src/components/utilities/constants.ts` and `types.ts`.

## What must stay in sync

| Contract | Backend | Frontend |
|---|---|---|
| Route URLs | `app.ts` prefix + `routes/*.routes.ts` path | One constant per route in `constants.ts` (e.g. `CREATE_LEAGUE_ROUTE`) |
| Request/response shapes | `types/api-types.ts`, Prisma models | `utilities/types.ts`, rewritten by hand rather than imported |
| Enum values | `prisma/schema.prisma` enums | String unions in `types.ts`. **Drift exists right now:** the web's `ActivityStatus` is missing `UPCOMING`, and its `Notification` has no `type`/`joinRequestId`. |
| Error body | `{ Error: string }` | `postDataToServer` reads `message`, `error` or `Error`. **`getDataFromServer` reads only `message`/`error`**, so backend errors on GET requests show up as a generic message. `adminFetch` reads `Error`. |
| Workflow IDs and step names | `workflows/*.ts` (`id`, `steps[].name`) registered in `workflow.definitions.ts` | Hardcoded `WORKFLOWS` list in `components/Admin/WorkflowsTab.tsx` (`id`, `stepNames`, `requiresInput`) |
| Workflow inputs | `LookFinderInput`, `SendEmailInput`, `SendNotificationInput`, `DatabaseRestoreInput` in `types/domain-types.ts` | Input forms in `WorkflowsTab.tsx` |
| Email casing | Stored UPPERCASE. `/users/auth` and `/users/create` uppercase the input and return the stored email. | After login, `AuthContext` keeps the **server-returned (uppercase)** email and sends it in later requests. See [gotchas.md](gotchas.md). |
| Admin identity | `ADMIN_EMAIL` env var (compared case-insensitively) | `VITE_ADMIN_EMAIL` is compared with `===` against the uppercase email, so **it must be uppercase**. It only decides whether to show admin UI and isn't a security boundary. |

## Routes

Auth key: **P** = public, **J** = JWT (`protect`), **JA** = JWT from an admin account (`protect` + `requireAdmin`), **A** = admin key (`protectAdmin`). Routes marked † are **not called by the web app** today: they're used by scripts or admins, are legacy, or are waiting on features that aren't built.

| Prefix | Auth | Routes |
|---|---|---|
| *(root)* | P | `GET /health`†, `GET /track/ping` |
| `/users` | mixed | P: `POST auth`, `POST create` · J: `POST updatePassword`, `GET getUserRecord` (never includes `password`), `PATCH displayName`, `POST getDisplayNames` · JA: `GET getAll`†, `GET getAllEmails`† (the iOS app calls this during sign-up and has to stop) · A: `POST setAdmin`† |
| `/league` | J | `GET getAllLeagues`, `GET allUserLeagues`†, `GET inactiveUserLeagues`, `GET getAvailableLeagues`, `GET getAvailableByFranAndSeason`†, `POST getLeague`, `POST createLeague` |
| `/leagueOps` | J | Rosters: `GET getAllRosters`†, `GET getRostersByFranchiseAndSeason`, `POST getAllLeagueRosters`. Membership: `POST addUserToLeague`, `POST removeUserFromLeague`, `POST increaseLeagueSize`. Join requests: `POST requestToJoinLeague`†, `approveJoinRequest`†, `denyJoinRequest`†, `getPendingJoinRequests`† (**built on the backend, no UI yet**). Scoring (**JA**): `POST weeklyUpdate`† (the web uses `/admin/weeklyUpdate`), `POST weeklySurvey`† (legacy). Surveys: `GET getOpenSurveys`, `GET getAllSurveys`, `POST openFanSurvey`† (**JA**), `POST submitFanSurvey`, `POST computeFanSurvey`† (**JA**), `POST submitSeasonFinale`. History: `GET getEpisodeHistory`, `GET getTalliedFanSurveyResults` |
| `/notifications` | J | `POST get`, `POST getAllActive`, `POST newNotification`, `POST updateNotification` |
| `/queens` | J | `GET getQueensByFranSeas`, `POST addNewQueens` (**JA**) · †: `GET getAll`, `GET getQueenByName`, `GET getQueenStatus`, `POST addNewQueen` (**JA**), `POST updateQueenStatus` (**JA**), `POST getQueenId` |
| `/activeSeason` | J | `GET getActiveSeasons`, `GET getFinaleEligibleSeasons`, `GET getUpcomingSeasons`, `GET getAllSeasons`, `POST addSeason` (**JA**), `POST updateSeason` (setting `INACTIVE` requires `User.isAdmin`), `POST addBracket`† (**JA**), `GET getBrackets` |
| `/admin` | A | Scoring: `POST weeklyUpdate`, `POST endOfSeasonUpdate`, `POST computeSeasonFinale`†. Data: `GET users`, `GET activeSeasons`, `GET queens`, `GET brackets`, `GET tables`, `GET tables/:table`, `GET logs`. Users: `POST resetPassword`, `GET getJwt`. Database: `GET dump`†, `POST dump`† (restore), `GET backups`, `POST restoreFromBackup`†, `POST deleteLeague`†. Workflows: `POST workflows/execute`, `GET workflows/status/:executionId` |
| `/subscription` | J (webhook P) | `POST start`, `POST cancel`, `GET status`, `POST webhook`: **all † and stubs**. `start` always throws `NOT_IMPLEMENTED`. |

Each route's request body is documented in a `// Doc:` comment above it in `routes/*.routes.ts`. Read those rather than copying them here.

Route naming is inconsistent (`getQueensByFranSeas`, `allUserLeagues`, `/activeSeason` singular), and many reads use `POST`. Keep existing URLs as they are, because the web depends on them. For new routes, follow [style.md](style.md).

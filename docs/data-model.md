# Data Model

> What the tables hold and how they connect. Source of truth: `prisma/schema.prisma`. This explains the parts the schema can't show by itself.

## The big idea: string keys, almost no foreign keys

Only two real Prisma relations exist: `User → Membership` and `FanSurvey → FanSurveyData`. Everything else is joined **in app code** by matching strings:

| Joins on | Tables |
|---|---|
| `(franchise, season)` | nearly everything: `ActiveSeasons`, `Queen`, `League`, `Roster`, `Bracket`, `FanSurvey`, `EpisodeResult`, `SeasonFinaleResponse` |
| `leagueName` | `League` ↔ `Roster` ↔ `LeagueJoinRequest` |
| user **email** (uppercased) | `League.owner`, `League.users[]`, `Roster.username`, `Notification.source/destination`, `*.submittedBy`, `LeagueJoinRequest.requester` |
| queen **name** | `Roster.queens[]`, `Bracket.queens[]`, `EpisodeResult.*[]`, survey vote fields |

Consequences:
- Renaming a queen or changing a user's email **won't** cascade. Every array and string reference keeps the old value.
- League membership is `League.users: String[]` rather than a join table. To count a user's leagues, query `OR: [{ owner: email }, { users: { has: email } }]` (see `isOverFreeLeagueLimit`).
- `League.leagueName` is **globally unique** across every franchise and season, not just within one season.
- `Roster` has no unique constraint. Code has to check that a user isn't already in a league before adding them.

## Tables by area

- **Users:** `User`, which has email unique and uppercased, a bcrypt `password`, an optional `displayName`, and `isAdmin`. `Membership` is one-to-one with `User` and holds the Stripe fields, all unused so far.
- **Seasons:** `ActiveSeasons` has one row per `(franchise, season)` and carries the status, premiere date, and bracket configuration. `Bracket` has one row per `(franchise, season, bracketName)`, and its `queens[]` holds queen names.
- **Play:** `League`, `Roster`, `LeagueJoinRequest`.
- **Results:** `EpisodeResult` has one row per episode. `FanSurvey` is a survey window, and `FanSurveyData` holds one vote per user per survey. `SeasonFinaleResponse` holds one vote per user per season.
- **History:** `LeagueHistory` and `RosterHistory` are copies of the live rows. They keep `originalLeagueId`/`originalRecordId` and add `archivedAt`.
- **Ops:** `Notification`, `WorkflowExecutionResults` (completed workflow runs), and `SiteVisit` (one row per IP per UTC day).

## Season archiving

When `activeSeasons.service.updateSeason()` sets a season to `INACTIVE`, it calls `league.service.archiveLeagueSeason()`, which does three things:
1. Copies every `League` and `Roster` row for that franchise+season into `LeagueHistory`/`RosterHistory`.
2. Deletes those rows from the live tables.
3. **Deletes that season's `FanSurvey` and `FanSurveyData` for good.** They aren't archived anywhere.

Calling it again for the same season does nothing. Code that reads past seasons uses the history tables: `getAllRostersByLeague` falls back to `RosterHistory` when a league has no live rosters, and `inactiveUserLeagues` reads `LeagueHistory`.

## Enums

Prisma enums: `QueenStatus`, `ActivityStatus` (`UPCOMING`/`ACTIVE`/`INACTIVE`), `BracketName` (`A`/`B`/`C`), `NotificationType`, `JoinRequestStatus`. The web repo copies some of them by hand in `src/components/utilities/types.ts`. See [contracts.md](contracts.md).

Point values are TypeScript enums in `src/enums/enums.ts` and aren't stored in the database. See [domain.md](domain.md#scoring).

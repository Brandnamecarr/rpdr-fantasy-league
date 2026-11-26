# Domain Glossary & Scoring Rules

> The business concepts behind the code. Source of truth: `prisma/schema.prisma` and `src/enums/enums.ts` (point values), plus `src/services/leagueOps.service.ts` (how points are applied).

## Concepts

| Term | Meaning | Where it lives |
|---|---|---|
| **Franchise** | A Drag Race show, as a free-text string, e.g. `"USA"` or `"Allstars"`. It's not an enum, so values must match exactly. | `franchise` column on most tables |
| **Season** | A season number within a franchise. `(franchise, season)` identifies a season everywhere. | `ActiveSeasons` |
| **Season status** | `UPCOMING`: announced, the cast may be known, and leagues can form. `ACTIVE`: airing, so scoring and surveys run. `INACTIVE`: over and archived. | `ActiveSeasons.activityStatus` |
| **Queen** | A contestant in one franchise+season. Status: `ACTIVE`, `ELIMINATED`, `WINNER`, `RUNNER_UP`, `MS_CONGENIALITY`, `UNKNOWN_OR_ERROR`. | `Queen` |
| **League** | A group of users playing one franchise+season. It has an owner, a member list, a `maxPlayers` cap, and `maxQueensPerTeam` (default 3). | `League` |
| **Roster** / **team** | One user's team in one league: a `teamName`, the queens they picked, `currentPoints`, and `pointUpdates` (an array holding the points earned at each scoring event). | `Roster` |
| **Bracket** | Some seasons (e.g. All Stars 11) split the cast into groups `A`/`B`/`C` that compete in different episodes. When a season uses brackets, scoring and look-scraping are filtered to one bracket. | `Bracket`, `ActiveSeasons.isUsingBrackets` |
| **Episode result** | The official outcome of an episode, entered by an admin: maxi winner(s), top queens, eliminated queens, lip-sync winner, and whether it was Snatch Game. | `EpisodeResult` |
| **Fan survey** | A weekly vote that's open between `startDate` and `endDate`. Users in that season vote for Queen of the Week, Bottom of the Week, Lip Sync Winner, Best Dressed and Worst Dressed. | `FanSurvey`, `FanSurveyData` |
| **Look** | A queen's runway photo for an episode. The fan survey's "dressed" categories show these. | S3 `images/<franchise>/<season>/<episode>/`, plus images bundled in the web repo |
| **Season finale poll** | A one-time vote per user per season on the season awards (winner, runner-up, Miss Congeniality, and so on). It opens for 7 days (`SEASON_FINALE_SURVEY_WINDOW_DAYS`). | `SeasonFinaleResponse` |
| **Join request** | A request to join a league that the owner approves or denies, as an alternative to joining instantly. | `LeagueJoinRequest` |
| **Membership** | A paid tier, but **Stripe isn't integrated yet**. Free users may own or belong to **one** league in total. | `Membership`, `subscription.service.ts` |
| **Workflow** | An admin-run job with an ordered list of steps (backup, scrape looks, send email…). | `src/workflows/` |

## Scoring

Points belong to **queens**, and a roster earns the sum of its queens' points. A roster's total is **floored at 0** after each weekly update.

### Weekly episode update (`weeklyUpdate`, triggered by an admin)

Placement scores **overwrite** each other in this priority order (the last one wins):
bottom (-5) → eliminated (-15) → safe (+15) → top (+20) → maxi win (+25, or +30 for a **Snatch Game** win).

These **stack** on top of the placement score: mini-challenge win (+20) and lip-sync win (+20).

`BOTTOM_TWO_PLACEMENT`, `GOOD_RUNWAY`, `BAD_RUNWAY`, `ICONIC_MOMENT` and `CRINGE_MOMENT` are defined in `PointManipulation`, but `weeklyUpdate` doesn't use them.

Side effects:
- The `EpisodeResult` is upserted.
- Eliminated queens get `status = ELIMINATED`.
- If a bracket is given, only that bracket's queens score.

### Fan survey (`computeFanSurvey`)

This runs automatically: `surveyScheduler` checks every 10 minutes, and once on startup, for closed surveys that haven't been computed. In each category the plurality winner scores, and **ties all score**:
Queen of the Week +10, Bottom of the Week -5, Lip Sync Winner +20, Best Dressed +20, Worst Dressed -5.

The `FanSurvey.computed` flag makes sure a survey is computed only once. A survey with no responses is skipped.

### End of season

- `endOfSeasonUpdate` (admin): winner +50, runner-up +30. Every other queen still `ACTIVE` takes the elimination penalty (-15) and becomes `ELIMINATED`. This **doesn't** set the season `INACTIVE`; the admin does that separately.
- `computeSeasonFinale` (admin): tallies the finale poll and awards `LeaguePointAwards`. Values: winner 50, runner-up 30, best dressed 30, Miss Congeniality 20, trade of the season 15, most improved 10, fan favorite 10.
- Setting a season `INACTIVE` archives it. See [data-model.md](data-model.md#season-archiving).

### Legacy

`weeklySurvey` (`POST /leagueOps/weeklySurvey`, using `WeeklyBonusPoints`) is an older bonus mechanism. The web app no longer calls it, and the fan survey replaced it.

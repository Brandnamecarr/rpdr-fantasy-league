// Doc: FetchUpcomingSeasons will pull upcoming-season info (at minimum franchise/season/premiereDate)
// Doc: from an external source and store it via activeSeasons.service.ts's setUpcomingSeason(), which
// Doc: upserts into the existing ActiveSeasons table (as INACTIVE) — the same table/route the Dashboard's
// Doc: UpcomingSeasonsPanel already reads via GET /activeSeason/getUpcomingSeasons, so once this step is
// Doc: filled in, fetched premiere dates show up there with no frontend changes needed.
// Doc: `id` is the contract with the frontend (WorkflowsTab.tsx's hardcoded WORKFLOWS list) — keep it
// Doc: in sync if either side changes.
// Doc: TODO: the source isn't decided yet — step 1 only logs a TODO where the real fetch/scrape would go.
import logger from '../util/logger/LoggerImpl';
// TODO: once a source exists, import setUpcomingSeason from '../services/activeSeasons.service'
// and, for each fetched entry, call `await setUpcomingSeason(franchise, season, premiereDate)` to persist it.
import { WorkflowDefinition } from '../types/Interfaces';

// Doc: Step 1 — placeholder until a source is chosen (a wiki scrape like LookFinder, an RSS/announcement
// Doc: feed, a manual API, etc.). Logs a TODO and returns without touching the database.
function fetchUpcomingSeasonsStep(): string {
    logger.info('FetchUpcomingSeasons-L1-Fetch: TODO — upcoming-seasons source not decided yet; nothing fetched.');
    return 'TODO: upcoming-seasons source not decided yet — no data fetched.';
}

export const fetchUpcomingSeasons: WorkflowDefinition = {
    id: 'fetch-upcoming-seasons',
    name: 'Fetch Upcoming Seasons',
    steps: [
        { name: 'FetchUpcomingSeasons-L1-Fetch', run: fetchUpcomingSeasonsStep },
    ],
};

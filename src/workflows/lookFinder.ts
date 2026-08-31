// Doc: LookFinder scrapes queen look photos for a franchise/season/episode from the Drag Race fandom
// Doc: wiki and validates that every currently-active queen in that franchise/season has a matching
// Doc: uploaded file. `id` is the contract with the frontend (WorkflowsTab.tsx's hardcoded WORKFLOWS
// Doc: list) — keep it in sync if either side changes. Unlike the other workflows here, LookFinder
// Doc: requires `input` (see LookFinderInput in types/Interfaces.ts) passed through
// Doc: POST /admin/workflows/execute.
import * as cheerio from 'cheerio';
import logger from '../util/logger/LoggerImpl';
import { putFile, listKeys } from '../util/aws/S3Manager';
import { getByFranchiseAndSeason } from '../services/queen.service';
import { WorkflowDefinition, WorkflowInput, LookFinderInput } from '../types/Interfaces';
import { FRANCHISE_WIKI_PAGES, NON_RUNWAY_HEADER_KEYWORDS, EXTENSION_CONTENT_TYPES } from './workflow.constants';

// Doc: Narrows/validates the generic WorkflowInput bag into the franchise/season/episode LookFinder needs.
// Doc: Throws (failing the step, surfaced to the admin UI) if the required fields are missing or malformed.
function parseLookFinderInput(input?: WorkflowInput): LookFinderInput {
    const franchise = input?.franchise;
    const season = input?.season;
    const episode = input?.episode;

    if (typeof franchise !== 'string' || !franchise) {
        throw new Error('LookFinder requires a franchise (string)');
    }
    if (typeof season !== 'number') {
        throw new Error('LookFinder requires a season (number)');
    }
    if (typeof episode !== 'number') {
        throw new Error('LookFinder requires an episode (number)');
    }

    return { franchise, season, episode };
}

// Doc: S3 key prefix images are stored/looked-up under for a given franchise/season/episode.
const buildPrefix = ({ franchise, season, episode }: LookFinderInput): string =>
    `images/${franchise}/${season}/${episode}/`;

// Doc: Normalizes a queen name or filename stem for comparison (lowercase, punctuation/spaces -> dashes).
const slugify = (value: string): string =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const FANDOM_API = 'https://rupaulsdragrace.fandom.com/api.php';
const USER_AGENT = 'rpdr-fantasy-league/1.0';

// Doc: Words stripped from a table header / runway theme before comparing them so that
// Doc: "It's Giving Crowned Queen" matches a header of "It's Giving Crowned Queen Look".
const normalizeForCompare = (value: string): string =>
    value
        .toLowerCase()
        .replace(/\blooks?\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

// Doc: Resolves the fandom wiki page title (including the "/Looks" subpage) for a franchise/season.
function buildWikiPage(franchise: string, season: number): string {
    const template = FRANCHISE_WIKI_PAGES[franchise];
    if (!template) {
        throw new Error(`Unknown franchise '${franchise}'. Supported: ${Object.keys(FRANCHISE_WIKI_PAGES).join(', ')}`);
    }
    return `${template.replace('{season}', String(season))}/Looks`;
}

// Doc: Fetches the rendered HTML body of a fandom wiki page via the MediaWiki parse API.
async function fetchWikiHtml(page: string): Promise<string> {
    const url = `${FANDOM_API}?${new URLSearchParams({ action: 'parse', page, prop: 'text', format: 'json' })}`;
    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!resp.ok) {
        throw new Error(`Fandom wiki request failed (HTTP ${resp.status})`);
    }
    const data: any = await resp.json();
    if (data.error) {
        throw new Error(`MediaWiki API error: ${data.error.info ?? JSON.stringify(data.error)}`);
    }
    if (!data.parse?.text?.['*']) {
        throw new Error("Unexpected API response (no 'parse' key)");
    }
    return data.parse.text['*'];
}

// Doc: Rewrites a Wikia CDN image URL to the full-resolution original (strips the lazy-load
// Doc: scale-to-width-down suffix and any cache-busting query string).
function normalizeImgUrl(url: string): string {
    let out = url.startsWith('//') ? `https:${url}` : url;
    out = out.split('?')[0];
    const marker = '/revision/latest/';
    const idx = out.indexOf(marker);
    if (idx !== -1) {
        out = `${out.slice(0, idx)}/revision/latest`;
    }
    return out;
}

// Doc: Sorensen-Dice bigram similarity (0-1) between two strings, used for fuzzy name/header matching.
function diceCoefficient(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigramCounts = (s: string): Map<string, number> => {
        const counts = new Map<string, number>();
        for (let i = 0; i < s.length - 1; i++) {
            const bg = s.substring(i, i + 2);
            counts.set(bg, (counts.get(bg) ?? 0) + 1);
        }
        return counts;
    };

    const countsA = bigramCounts(a);
    const countsB = bigramCounts(b);
    let intersection = 0;
    for (const [bg, count] of countsA) {
        const other = countsB.get(bg);
        if (other) intersection += Math.min(count, other);
    }
    return (2 * intersection) / (a.length - 1 + (b.length - 1));
}

interface ScrapedLook {
    name: string;
    imgUrl: string;
}

interface EpisodeSection {
    runwayTheme: string;
    looks: ScrapedLook[];
}

// Doc: Parses one "Episode N Looks" section out of a Looks-page's rendered HTML: the runway theme,
// Doc: and each queen's image for that theme (picked out of a 2-3 column look table per queen tab).
function parseEpisodeSection(html: string, episode: number): EpisodeSection {
    const $ = cheerio.load(html);

    const heading = $('span.mw-headline')
        .filter((_, el) => $(el).text().trim() === `Episode ${episode} Looks`)
        .first();
    if (heading.length === 0) {
        throw new Error(`Images for Episode ${episode} have not been published to the wiki yet.`);
    }

    const h2 = heading.closest('h2');
    // nextUntil() only returns siblings, so wrap them in a container to search both those
    // siblings themselves (e.g. the theme <p>) and their descendants (e.g. the tabber) uniformly.
    const section = $('<div></div>').append(h2.nextUntil('h2').clone());

    // Runway theme is rendered as a paragraph like "<b><u>Runway Theme</u>:</b> It's Giving Crowned Queen".
    let runwayTheme: string | undefined;
    section.find('p').each((_, p) => {
        if (runwayTheme) return;
        const text = $(p).text();
        const match = text.match(/(?:Runway Theme|Theme)\s*:\s*(.+)/);
        if (match) {
            runwayTheme = match[1].replace(/\[\w+\]/g, '').split('\n')[0].trim();
        }
    });
    if (!runwayTheme) {
        throw new Error(`Runway theme not found for Episode ${episode}`);
    }

    const tabber = section.find('div.wds-tabber').first();
    if (tabber.length === 0) {
        throw new Error(`Images for Episode ${episode} have not been published to the wiki yet.`);
    }

    const tabNames = tabber
        .children('div.wds-tabs__wrapper')
        .find('li[data-hash]')
        .map((_, li) => $(li).text().trim())
        .get()
        .filter(Boolean);
    const panels = tabber.children('div.wds-tab__content').toArray();

    if (tabNames.length === 0 || tabNames.length !== panels.length) {
        throw new Error(`Images for Episode ${episode} have not been published to the wiki yet.`);
    }

    const normalizedTheme = normalizeForCompare(runwayTheme);
    const looks: ScrapedLook[] = [];
    const missing: string[] = [];

    for (let i = 0; i < panels.length; i++) {
        const name = tabNames[i];
        const panel = $(panels[i]);
        const headers = panel.find('table.wikitable th').map((_, th) => $(th).text().trim()).get();
        const cells = panel.find('table.wikitable tr').eq(1).find('td').toArray();

        if (headers.length === 0 || cells.length === 0) {
            missing.push(name);
            continue;
        }

        // Prefer the column whose header names this episode's runway theme (e.g. "Paris, France Look"
        // for theme "Paris, France"). Falls back to the sole column that isn't an entrance/lip-sync/
        // promo look when the theme text isn't reproduced verbatim in the header.
        let columnIndex = headers.findIndex(h => {
            const normalizedHeader = normalizeForCompare(h);
            return (
                normalizedHeader.includes(normalizedTheme) ||
                normalizedTheme.includes(normalizedHeader) ||
                diceCoefficient(normalizedHeader, normalizedTheme) > 0.6
            );
        });

        if (columnIndex === -1) {
            const candidates = headers
                .map((h, idx) => ({ h, idx }))
                .filter(({ h }) => !NON_RUNWAY_HEADER_KEYWORDS.some(k => h.toLowerCase().includes(k)));
            if (candidates.length === 1) {
                columnIndex = candidates[0].idx;
            }
        }

        if (columnIndex === -1 || columnIndex >= cells.length) {
            missing.push(name);
            continue;
        }

        const img = $(cells[columnIndex]).find('img').first();
        const rawUrl = img.attr('data-src') || img.attr('src') || '';
        if (!rawUrl || rawUrl.startsWith('data:')) {
            missing.push(name);
            continue;
        }

        looks.push({ name, imgUrl: normalizeImgUrl(rawUrl) });
    }

    if (missing.length > 0) {
        throw new Error(
            `Could not determine the "${runwayTheme}" look image for ${missing.length} queen(s): ${missing.join(', ')}`
        );
    }

    return { runwayTheme, looks };
}

// Doc: Fuzzy-matches scraped wiki tab names (e.g. "A'keria C. Davenport") against this franchise/
// Doc: season's DB queen names (e.g. "Akeria Davenport") via bigram similarity. Throws if any
// Doc: scraped name can't be matched confidently, or if two scraped names collide on one DB name.
function matchQueenNames(scrapedNames: string[], dbNames: string[]): Map<string, string> {
    const normalizedDbNames = dbNames.map(n => ({ original: n, normalized: normalizeForCompare(n) }));
    const mapping = new Map<string, string>();
    const failed: string[] = [];

    for (const scraped of scrapedNames) {
        const normalizedScraped = normalizeForCompare(scraped);
        let best: { original: string; score: number } | undefined;
        for (const candidate of normalizedDbNames) {
            const score = diceCoefficient(normalizedScraped, candidate.normalized);
            if (!best || score > best.score) {
                best = { original: candidate.original, score };
            }
        }
        if (best && best.score >= 0.5) {
            mapping.set(scraped, best.original);
        } else {
            failed.push(scraped);
        }
    }

    if (failed.length > 0) {
        throw new Error(`Could not match scraped queen name(s) to the DB roster: ${failed.join(', ')}`);
    }

    const usedDbNames = new Set<string>();
    for (const dbName of mapping.values()) {
        if (usedDbNames.has(dbName)) {
            throw new Error(`Two or more scraped queen names matched the same DB queen '${dbName}' — ambiguous match`);
        }
        usedDbNames.add(dbName);
    }

    return mapping;
}

// Doc: Extracts a lowercase file extension from an image URL's path, defaulting to jpg.
function extensionFromUrl(url: string): string {
    const match = url.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : 'jpg';
}

// Doc: Step 1 — scrapes this episode's runway-theme look photo for every queen tabbed on the
// Doc: franchise/season's fandom wiki Looks page, and uploads each to S3 under this episode's prefix,
// Doc: named after the matching DB queen (images/{franchise}/{season}/{episode}/{queenName}.{ext}).
async function scrapeQueenImages(input?: WorkflowInput): Promise<string> {
    const lookFinderInput = parseLookFinderInput(input);
    const { franchise, season, episode } = lookFinderInput;

    const page = buildWikiPage(franchise, season);
    logger.info('LookFinder-L1-Scrape: fetching wiki page', { page });
    const html = await fetchWikiHtml(page);

    const { runwayTheme, looks } = parseEpisodeSection(html, episode);
    logger.info('LookFinder-L1-Scrape: parsed episode section', {
        runwayTheme, queenCount: looks.length,
    });

    const queens = await getByFranchiseAndSeason(franchise, season);
    const nameMap = matchQueenNames(looks.map(l => l.name), queens.map(q => q.name));

    const prefix = buildPrefix(lookFinderInput);
    for (const look of looks) {
        const dbName = nameMap.get(look.name)!;
        const ext = extensionFromUrl(look.imgUrl);
        const key = `${prefix}${dbName}.${ext}`;

        const imgResp = await fetch(look.imgUrl, { headers: { 'User-Agent': USER_AGENT } });
        if (!imgResp.ok) {
            throw new Error(`Failed to download image for '${dbName}' (HTTP ${imgResp.status}): ${look.imgUrl}`);
        }
        const body = Buffer.from(await imgResp.arrayBuffer());

        await putFile(key, body, EXTENSION_CONTENT_TYPES[ext] ?? 'application/octet-stream');
        logger.info('LookFinder-L1-Scrape: uploaded queen image', { key, sourceUrl: look.imgUrl });
    }

    return `Uploaded ${looks.length} image(s) for runway theme "${runwayTheme}" to ${prefix}`;
}

// Doc: Step 2 — every currently-ACTIVE queen in the franchise/season must have a matching S3 object
// Doc: (by slugified filename stem) under this episode's prefix. Throws (failing the step) if any
// Doc: active queen has no matching file.
async function validateQueenImages(input?: WorkflowInput): Promise<string> {
    const lookFinderInput = parseLookFinderInput(input);
    const { franchise, season } = lookFinderInput;
    const prefix = buildPrefix(lookFinderInput);

    const queens = await getByFranchiseAndSeason(franchise, season);
    const activeQueens = queens.filter(q => q.status === 'ACTIVE');

    const keys = await listKeys(prefix);
    const uploadedStems = new Set(
        keys.map(key => slugify(key.slice(prefix.length).replace(/\.[^/.]+$/, '')))
    );

    const missing = activeQueens
        .map(q => q.name)
        .filter(name => !uploadedStems.has(slugify(name)));

    if (missing.length > 0) {
        logger.error('LookFinder-L2-Validate: missing image files', { franchise, season, missing });
        throw new Error(`Missing image files for: ${missing.join(', ')}`);
    }

    logger.info('LookFinder-L2-Validate: all active queens have matching files', {
        franchise, season, count: activeQueens.length,
    });
    return `All ${activeQueens.length} active queen(s) have matching image files.`;
}

export const lookFinder: WorkflowDefinition = {
    id: 'look-finder',
    name: 'LookFinder',
    steps: [
        { name: 'LookFinder-L1-Scrape', run: scrapeQueenImages },
        { name: 'LookFinder-L2-Validate', run: validateQueenImages },
    ],
};

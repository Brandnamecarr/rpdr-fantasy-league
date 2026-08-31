// Doc: Shared constant lookup tables for workflow steps in this directory. Add new constants here
// Doc: rather than inline in a workflow file once they're static data (not logic).

// Doc: Maps the franchise names used in this app to their fandom wiki page title templates.
// Doc: `{season}` is substituted with the numeric season. Keep in sync with rpdr-fantasy-tools'
// Doc: EpisodeLooksManager.FRANCHISE_WIKI_PAGES, which uses the same values. Used by lookFinder.ts.
export const FRANCHISE_WIKI_PAGES: Record<string, string> = {
    Allstars: "RuPaul's Drag Race All Stars (Season {season})",
    Main: "RuPaul's Drag Race (Season {season})",
    UK: "RuPaul's Drag Race UK (Series {season})",
    Canada: "Canada's Drag Race (Season {season})",
};

// Doc: Header keywords that mark a look column as NOT the runway-theme look (entrance looks,
// Doc: lip-sync looks, and All Stars mini-challenge/promo looks that precede the runway).
// Doc: Used by lookFinder.ts as a fallback when the theme text isn't reproduced verbatim in a header.
export const NON_RUNWAY_HEADER_KEYWORDS = ['entrance', 'lip sync', 'lipsync', 'promo', 'rumble', 'snatch game'];

// Doc: Maps a lowercase file extension to its MIME type for S3 uploads. Used by lookFinder.ts.
export const EXTENSION_CONTENT_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
};

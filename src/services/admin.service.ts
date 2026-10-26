import * as bcrypt from 'bcrypt';
import prisma from '../db/prisma.client';
import logger from '../util/logger/LoggerImpl';
import { getFile, listKeys } from '../util/aws/S3Manager';
import { RestoreDatabaseBody } from '../types/Interfaces';

const BACKUP_PREFIX = 'database_backup/';

// Doc: Registry of every table exposed to the admin database viewer, keyed by the name shown in the
// Doc: dropdown. Each entry's fetchAll() is the table's admin-gated "fetch all" method — add new
// Doc: models here to make them selectable. User rows have their password hash stripped.
export const TABLE_REGISTRY: Record<string, { fetchAll: () => Promise<Record<string, unknown>[]> }> = {
    users:                 { fetchAll: () => prisma.user.findMany({ select: { id: true, email: true, displayName: true, createdAt: true } }) },
    leagues:               { fetchAll: () => prisma.league.findMany() },
    rosters:                { fetchAll: () => prisma.roster.findMany() },
    leagueHistory:          { fetchAll: () => prisma.leagueHistory.findMany() },
    rosterHistory:          { fetchAll: () => prisma.rosterHistory.findMany() },
    notifications:          { fetchAll: () => prisma.notification.findMany() },
    queens:                 { fetchAll: () => prisma.queen.findMany() },
    activeSeasons:          { fetchAll: () => prisma.activeSeasons.findMany() },
    brackets:               { fetchAll: () => prisma.bracket.findMany() },
    fanSurveys:             { fetchAll: () => prisma.fanSurvey.findMany() },
    fanSurveyData:          { fetchAll: () => prisma.fanSurveyData.findMany() },
    seasonFinaleResponses:  { fetchAll: () => prisma.seasonFinaleResponse.findMany() },
    episodeResults:         { fetchAll: () => prisma.episodeResult.findMany() },
    workflowExecutionResults: { fetchAll: () => prisma.workflowExecutionResults.findMany() },
    siteVisits:             { fetchAll: () => prisma.siteVisit.findMany() },
};

// Doc: The dropdown's table list — sorted names from TABLE_REGISTRY.
export const listTableNames = (): string[] => Object.keys(TABLE_REGISTRY).sort();

// Doc: Runs the given table's fetchAll(). Returns undefined if the table name isn't registered.
export const fetchTableRecords = async (table: string): Promise<Record<string, unknown>[] | undefined> => {
    const entry = TABLE_REGISTRY[table];
    if (!entry) return undefined;
    return entry.fetchAll();
};

// Doc: Queries every table in the database and returns the full dump as a plain JSON-serializable
// Doc: object. User password hashes are omitted. Shared by the GET /admin/dump route (admin.controller.ts)
// Doc: and the DatabaseBackup workflow (workflows/databaseBackup.ts) so both stay in sync.
export const buildDatabaseDump = async () => {
    logger.debug('Admin.Service.ts: buildDatabaseDump() - querying all tables');

    const [rawUsers, leagues, rosters, leagueHistory, rosterHistory, notifications, queens, activeSeasons, brackets, fanSurveys, fanSurveyData, seasonFinaleResponses, episodeResults] =
        await Promise.all([
            prisma.user.findMany(),
            prisma.league.findMany(),
            prisma.roster.findMany(),
            prisma.leagueHistory.findMany(),
            prisma.rosterHistory.findMany(),
            prisma.notification.findMany(),
            prisma.queen.findMany(),
            prisma.activeSeasons.findMany(),
            prisma.bracket.findMany(),
            prisma.fanSurvey.findMany(),
            prisma.fanSurveyData.findMany(),
            prisma.seasonFinaleResponse.findMany(),
            prisma.episodeResult.findMany(),
        ]);

    // Strip password hashes — everything else is included as-is
    const users = rawUsers.map(({ password: _omit, ...rest }) => rest);

    return {
        timestamp: new Date().toISOString(),
        tables: {
            users:                  { count: users.length,                  records: users },
            leagues:                { count: leagues.length,                records: leagues },
            rosters:                { count: rosters.length,                records: rosters },
            leagueHistory:          { count: leagueHistory.length,          records: leagueHistory },
            rosterHistory:          { count: rosterHistory.length,          records: rosterHistory },
            notifications:          { count: notifications.length,          records: notifications },
            queens:                 { count: queens.length,                 records: queens },
            activeSeasons:          { count: activeSeasons.length,          records: activeSeasons },
            brackets:               { count: brackets.length,               records: brackets },
            fanSurveys:             { count: fanSurveys.length,             records: fanSurveys },
            fanSurveyData:          { count: fanSurveyData.length,          records: fanSurveyData },
            seasonFinaleResponses:  { count: seasonFinaleResponses.length,  records: seasonFinaleResponses },
            episodeResults:         { count: episodeResults.length,         records: episodeResults },
        },
    };
};

// Doc: Wipes every table and re-inserts records from a dump's `tables` object (the shape returned by
// Doc: buildDatabaseDump()). Users are restored with a placeholder password ('RESTORE_PLACEHOLDER')
// Doc: since hashes are never included in dumps. Auto-increment sequences are reset afterward so new
// Doc: records don't collide with restored IDs. Shared by POST /admin/dump and POST /admin/restoreFromBackup.
export const restoreDatabaseFromDump = async (tables: RestoreDatabaseBody['tables']): Promise<void> => {
    const {
        users                 = { records: [] },
        leagues               = { records: [] },
        rosters               = { records: [] },
        leagueHistory         = { records: [] },
        rosterHistory         = { records: [] },
        notifications         = { records: [] },
        queens                = { records: [] },
        activeSeasons         = { records: [] },
        brackets              = { records: [] },
        fanSurveys            = { records: [] },
        fanSurveyData         = { records: [] },
        seasonFinaleResponses = { records: [] },
        episodeResults        = { records: [] },
    } = tables;

    // Placeholder hash for restored users — passwords were stripped from the dump.
    const placeholderPassword = await bcrypt.hash('RESTORE_PLACEHOLDER', 10);

    // Wipe every table first (child tables before parents to respect FK constraints).
    await prisma.$transaction([
        prisma.episodeResult.deleteMany(),
        prisma.seasonFinaleResponse.deleteMany(),
        prisma.fanSurveyData.deleteMany(),
        prisma.fanSurvey.deleteMany(),
        prisma.bracket.deleteMany(),
        prisma.activeSeasons.deleteMany(),
        prisma.queen.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.roster.deleteMany(),
        prisma.league.deleteMany(),
        prisma.rosterHistory.deleteMany(),
        prisma.leagueHistory.deleteMany(),
        prisma.user.deleteMany(),
    ]);

    logger.info('Admin.Service.ts: restoreDatabaseFromDump() - all tables wiped');

    // Re-insert each table (skip empty arrays to avoid no-op createMany calls).
    if (users.records.length > 0) {
        await prisma.user.createMany({
            data: users.records.map((u) => ({ ...u, password: placeholderPassword })),
        });
    }
    if (leagues.records.length > 0) {
        await prisma.league.createMany({ data: leagues.records });
    }
    if (rosters.records.length > 0) {
        await prisma.roster.createMany({ data: rosters.records });
    }
    if (leagueHistory.records.length > 0) {
        await prisma.leagueHistory.createMany({ data: leagueHistory.records });
    }
    if (rosterHistory.records.length > 0) {
        await prisma.rosterHistory.createMany({ data: rosterHistory.records });
    }
    if (notifications.records.length > 0) {
        await prisma.notification.createMany({ data: notifications.records });
    }
    if (queens.records.length > 0) {
        await prisma.queen.createMany({ data: queens.records });
    }
    if (activeSeasons.records.length > 0) {
        await prisma.activeSeasons.createMany({ data: activeSeasons.records });
    }
    if (brackets.records.length > 0) {
        await prisma.bracket.createMany({ data: brackets.records });
    }
    // FanSurvey must be restored before FanSurveyData (FK dependency)
    if (fanSurveys.records.length > 0) {
        await prisma.fanSurvey.createMany({ data: fanSurveys.records });
    }
    if (fanSurveyData.records.length > 0) {
        await prisma.fanSurveyData.createMany({ data: fanSurveyData.records });
    }
    if (seasonFinaleResponses.records.length > 0) {
        await prisma.seasonFinaleResponse.createMany({ data: seasonFinaleResponses.records });
    }
    if (episodeResults.records.length > 0) {
        await prisma.episodeResult.createMany({ data: episodeResults.records });
    }

    // Reset auto-increment sequences so the next insert doesn't collide with restored IDs.
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE((SELECT MAX(id) FROM "User"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"League"', 'id'), COALESCE((SELECT MAX(id) FROM "League"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Roster"', 'recordId'), COALESCE((SELECT MAX("recordId") FROM "Roster"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"LeagueHistory"', 'id'), COALESCE((SELECT MAX(id) FROM "LeagueHistory"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"RosterHistory"', 'recordId'), COALESCE((SELECT MAX("recordId") FROM "RosterHistory"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Notification"', 'notifId'), COALESCE((SELECT MAX("notifId") FROM "Notification"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Queen"', 'queenId'), COALESCE((SELECT MAX("queenId") FROM "Queen"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"ActiveSeasons"', 'seasonId'), COALESCE((SELECT MAX("seasonId") FROM "ActiveSeasons"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Bracket"', 'bracketId'), COALESCE((SELECT MAX("bracketId") FROM "Bracket"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"FanSurvey"', 'id'), COALESCE((SELECT MAX(id) FROM "FanSurvey"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"FanSurveyData"', 'id'), COALESCE((SELECT MAX(id) FROM "FanSurveyData"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"SeasonFinaleResponse"', 'id'), COALESCE((SELECT MAX(id) FROM "SeasonFinaleResponse"), 1))`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"EpisodeResult"', 'id'), COALESCE((SELECT MAX(id) FROM "EpisodeResult"), 1))`;

    logger.info('Admin.Service.ts: restoreDatabaseFromDump() - restore complete');
};

// Doc: Lists the <date-time> folder names of every backup under database_backup/ in S3
// Doc: (e.g. "2026-08-31T14-05-22Z"), sorted ascending — ISO-8601-with-dashed-time sorts
// Doc: chronologically as a plain string, so the last entry is always the most recent.
export const listBackupTimestamps = async (): Promise<string[]> => {
    const keys = await listKeys(BACKUP_PREFIX);
    const timestamps = new Set<string>();
    for (const key of keys) {
        const match = key.slice(BACKUP_PREFIX.length).match(/^([^/]+)\//);
        if (match) timestamps.add(match[1]);
    }
    return Array.from(timestamps).sort();
};

// Doc: Resolves the S3 key of a backup's dump.json. With no `date`, returns the single most recent
// Doc: backup. With `date`, matches it against the start of each backup's <date-time> folder name
// Doc: (e.g. "2026-08-31" matches every backup taken that day) and returns the latest match.
// Doc: Returns undefined if no backups exist (or none match `date`).
export const resolveBackupKey = async (date?: string): Promise<string | undefined> => {
    const timestamps = await listBackupTimestamps();
    const candidates = date ? timestamps.filter(t => t.startsWith(date)) : timestamps;
    const latest = candidates[candidates.length - 1];
    return latest ? `${BACKUP_PREFIX}${latest}/dump.json` : undefined;
};

export interface RestoredFromBackup {
    key: string;
    backupTimestamp?: string;
}

// Doc: Downloads a database dump from S3 (latest, or the latest matching `date`) and restores it.
// Doc: Returns undefined if no matching backup was found; otherwise the S3 key and the dump's own
// Doc: recorded `timestamp` field (from buildDatabaseDump(), not the S3 folder name).
export const restoreDatabaseFromBackup = async (date?: string): Promise<RestoredFromBackup | undefined> => {
    const key = await resolveBackupKey(date);
    if (!key) return undefined;

    logger.info('Admin.Service.ts: restoreDatabaseFromBackup() - downloading backup', { key });
    const body = await getFile(key);
    const dump: { timestamp?: string; tables: RestoreDatabaseBody['tables'] } = JSON.parse(body.toString('utf-8'));

    await restoreDatabaseFromDump(dump.tables);

    return { key, backupTimestamp: dump.timestamp };
};

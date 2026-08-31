import prisma from '../db/prisma.client';
import logger from '../util/logger/LoggerImpl';

// Doc: Queries every table in the database and returns the full dump as a plain JSON-serializable
// Doc: object. User password hashes are omitted. Shared by the GET /admin/dump route (admin.controller.ts)
// Doc: and the DatabaseBackup workflow (workflows/databaseBackup.ts) so both stay in sync.
export const buildDatabaseDump = async () => {
    logger.debug('Admin.Service.ts: buildDatabaseDump() - querying all tables');

    const [rawUsers, leagues, rosters, notifications, queens, activeSeasons, brackets, fanSurveys, fanSurveyData, seasonFinaleResponses, episodeResults] =
        await Promise.all([
            prisma.user.findMany(),
            prisma.league.findMany(),
            prisma.roster.findMany(),
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

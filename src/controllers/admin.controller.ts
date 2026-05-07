import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import prisma from '../db/prisma.client';
import logger from '../util/LoggerImpl';
import * as leagueOpsService from '../services/leagueOps.service';

// Doc: Queries every table in the database and returns the full dump as a JSON object.
// Doc: User password hashes are omitted from the dump.
// Doc: Route: GET /admin/dump  (protected by protectAdmin)
export const dumpDatabase = async (_req: Request, res: Response) => {
    logger.info('Admin.Controller.ts: dumpDatabase() - starting full database dump');

    try {
        const [rawUsers, leagues, rosters, notifications, queens, activeSeasons, brackets, fanSurveyResponses, seasonFinaleResponses] =
            await Promise.all([
                prisma.user.findMany(),
                prisma.league.findMany(),
                prisma.roster.findMany(),
                prisma.notification.findMany(),
                prisma.queen.findMany(),
                prisma.activeSeasons.findMany(),
                prisma.bracket.findMany(),
                prisma.fanSurveyResponse.findMany(),
                prisma.seasonFinaleResponse.findMany(),
            ]);

        // Strip password hashes — everything else is included as-is
        const users = rawUsers.map(({ password: _omit, ...rest }) => rest);

        const dump = {
            timestamp: new Date().toISOString(),
            tables: {
                users:                  { count: users.length,                  records: users },
                leagues:                { count: leagues.length,                records: leagues },
                rosters:                { count: rosters.length,                records: rosters },
                notifications:          { count: notifications.length,          records: notifications },
                queens:                 { count: queens.length,                 records: queens },
                activeSeasons:          { count: activeSeasons.length,          records: activeSeasons },
                brackets:               { count: brackets.length,               records: brackets },
                fanSurveyResponses:     { count: fanSurveyResponses.length,     records: fanSurveyResponses },
                seasonFinaleResponses:  { count: seasonFinaleResponses.length,  records: seasonFinaleResponses },
            },
        };

        logger.info('Admin.Controller.ts: dumpDatabase() - dump complete', { tableCount: Object.keys(dump.tables).length });
        res.status(200).json(dump);

    } catch (error) {
        logger.error('Admin.Controller.ts: dumpDatabase() - failed', { error });
        res.status(500).json({ Error: 'Failed to dump database' });
    }
};

// Doc: Wipes all tables and restores from a dump payload matching the shape returned by dumpDatabase.
// Doc: Users are restored with a placeholder password ('RESTORE_PLACEHOLDER') since hashes are not included in dumps.
// Doc: Auto-increment sequences are reset after inserts so new records get correct IDs.
// Doc: Route: POST /admin/dump  (protected by protectAdmin)
export const restoreDatabase = async (req: Request, res: Response) => {
    logger.info('Admin.Controller.ts: restoreDatabase() - starting full database restore');

    const { tables } = req.body ?? {};
    if (!tables) {
        return res.status(400).json({ Error: 'Invalid dump format: missing tables object' });
    }

    const {
        users                = { records: [] },
        leagues              = { records: [] },
        rosters              = { records: [] },
        notifications        = { records: [] },
        queens               = { records: [] },
        activeSeasons        = { records: [] },
        brackets             = { records: [] },
        fanSurveyResponses   = { records: [] },
        seasonFinaleResponses = { records: [] },
    } = tables;

    try {
        // Placeholder hash for restored users — passwords were stripped from the dump.
        const placeholderPassword = await bcrypt.hash('RESTORE_PLACEHOLDER', 10);

        // Wipe every table first.
        await prisma.$transaction([
            prisma.seasonFinaleResponse.deleteMany(),
            prisma.fanSurveyResponse.deleteMany(),
            prisma.bracket.deleteMany(),
            prisma.activeSeasons.deleteMany(),
            prisma.queen.deleteMany(),
            prisma.notification.deleteMany(),
            prisma.roster.deleteMany(),
            prisma.league.deleteMany(),
            prisma.user.deleteMany(),
        ]);

        logger.info('Admin.Controller.ts: restoreDatabase() - all tables wiped');

        // Re-insert each table (skip empty arrays to avoid no-op createMany calls).
        if (users.records.length > 0) {
            await prisma.user.createMany({
                data: users.records.map((u: any) => ({ ...u, password: placeholderPassword })),
            });
        }
        if (leagues.records.length > 0) {
            await prisma.league.createMany({ data: leagues.records });
        }
        if (rosters.records.length > 0) {
            await prisma.roster.createMany({ data: rosters.records });
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
        if (fanSurveyResponses.records.length > 0) {
            await prisma.fanSurveyResponse.createMany({ data: fanSurveyResponses.records });
        }
        if (seasonFinaleResponses.records.length > 0) {
            await prisma.seasonFinaleResponse.createMany({ data: seasonFinaleResponses.records });
        }

        // Reset auto-increment sequences so the next insert doesn't collide with restored IDs.
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE((SELECT MAX(id) FROM "User"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"League"', 'id'), COALESCE((SELECT MAX(id) FROM "League"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Roster"', 'recordId'), COALESCE((SELECT MAX("recordId") FROM "Roster"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Notification"', 'notifId'), COALESCE((SELECT MAX("notifId") FROM "Notification"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Queen"', 'queenId'), COALESCE((SELECT MAX("queenId") FROM "Queen"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"ActiveSeasons"', 'seasonId'), COALESCE((SELECT MAX("seasonId") FROM "ActiveSeasons"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Bracket"', 'bracketId'), COALESCE((SELECT MAX("bracketId") FROM "Bracket"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"FanSurveyResponse"', 'id'), COALESCE((SELECT MAX(id) FROM "FanSurveyResponse"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"SeasonFinaleResponse"', 'id'), COALESCE((SELECT MAX(id) FROM "SeasonFinaleResponse"), 1))`;

        logger.info('Admin.Controller.ts: restoreDatabase() - restore complete');
        res.status(200).json({ message: 'Database restored successfully' });

    } catch (error) {
        logger.error('Admin.Controller.ts: restoreDatabase() - failed', { error });
        res.status(500).json({ Error: 'Failed to restore database' });
    }
};

// Doc: Tallies all season finale survey responses for a franchise+season and applies point awards to all rosters.
// Doc: Body: { franchise: string, season: number }
// Doc: Route: POST /admin/computeSeasonFinale  (protected by protectAdmin)
export const computeSeasonFinale = async (req: Request, res: Response) => {
    const { franchise, season } = req.body;

    if (!franchise || !season) {
        logger.error('Admin.Controller.ts: computeSeasonFinale() - missing franchise or season');
        return res.status(400).json({ Error: 'franchise and season are required' });
    }

    logger.info('Admin.Controller.ts: computeSeasonFinale() - request received', { franchise, season });

    try {
        const results = await leagueOpsService.computeSeasonFinale(franchise, Number(season));
        if (!results) {
            logger.error('Admin.Controller.ts: computeSeasonFinale() - no responses or rosters found', { franchise, season });
            return res.status(404).json({ Error: 'No season finale responses found for this franchise/season' });
        }
        logger.info('Admin.Controller.ts: computeSeasonFinale() - points applied', { updatedRosters: results.length, franchise, season });
        return res.status(200).json({ updatedRosters: results.length, rosters: results });
    } catch (error) {
        logger.error('Admin.Controller.ts: computeSeasonFinale() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error computing season finale results' });
    }
};

import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import prisma from '../db/prisma.client';
import logger from '../util/LoggerImpl';
import * as leagueOpsService from '../services/leagueOps.service';

// Doc: Returns all users (id, email, displayName, createdAt) — passwords excluded.
// Doc: Route: GET /admin/users
export const getAllUsers = async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, displayName: true, createdAt: true },
            orderBy: { email: 'asc' },
        });
        return res.status(200).json(users);
    } catch (error) {
        logger.error('Admin.Controller.ts: getAllUsers() - failed', { error });
        return res.status(500).json({ Error: 'Failed to fetch users' });
    }
};

// Doc: Force-resets a user's password to the supplied plaintext (bcrypt-hashed before storage).
// Doc: Body: { email: string, newPassword: string }
// Doc: Route: POST /admin/resetPassword
export const resetUserPassword = async (req: Request, res: Response) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ Error: 'email and newPassword are required' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ Error: 'Password must be at least 8 characters' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ Error: `User ${email} not found` });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { email }, data: { password: hashed } });

        logger.info('Admin.Controller.ts: resetUserPassword() - password reset', { email });
        return res.status(200).json({ message: `Password reset for ${email}` });
    } catch (error) {
        logger.error('Admin.Controller.ts: resetUserPassword() - failed', { error });
        return res.status(500).json({ Error: 'Failed to reset password' });
    }
};

// Doc: Admin-keyed weekly update — same logic as the leagueOps weeklyUpdate but protected by admin key instead of JWT.
// Doc: Body: { franchise, season, episode, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated, bracketName? }
// Doc: Route: POST /admin/weeklyUpdate
export const adminWeeklyUpdate = async (req: Request, res: Response) => {
    const { franchise, season, episode, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated, bracketName } = req.body;

    if (!franchise || !season || !episode) {
        return res.status(400).json({ Error: 'franchise, season, and episode are required' });
    }

    logger.info('Admin.Controller.ts: adminWeeklyUpdate() - request received', { franchise, season, episode, bracketName });

    try {
        const resp = await leagueOpsService.weeklyUpdate(
            franchise, Number(season), Number(episode),
            maxiWinner ?? [], isSnatchGame ?? false, miniWinner ?? [],
            topQueens ?? [], safeQueens ?? [], bottomQueens ?? [],
            lipSyncWinner ?? [], eliminated ?? [], bracketName
        );
        if (!resp) return res.status(404).json({ Error: 'weeklyUpdate returned no response' });
        logger.info('Admin.Controller.ts: adminWeeklyUpdate() - complete', { franchise, season, episode });
        return res.status(201).json(resp);
    } catch (error) {
        logger.error('Admin.Controller.ts: adminWeeklyUpdate() - failed', { error });
        return res.status(500).json({ Error: 'Error processing weekly update' });
    }
};

// Doc: Returns active seasons for the admin panel season selector.
// Doc: Route: GET /admin/activeSeasons
export const getAdminActiveSeasons = async (_req: Request, res: Response) => {
    try {
        const seasons = await prisma.activeSeasons.findMany({
            where: { activityStatus: 'ACTIVE' },
            orderBy: [{ franchise: 'asc' }, { season: 'asc' }],
        });
        return res.status(200).json(seasons);
    } catch (error) {
        logger.error('Admin.Controller.ts: getAdminActiveSeasons() - failed', { error });
        return res.status(500).json({ Error: 'Failed to fetch active seasons' });
    }
};

// Doc: Returns brackets for a franchise/season to filter queen suggestions in the admin form.
// Doc: Query: ?franchise=&season=
// Doc: Route: GET /admin/brackets
export const getAdminBrackets = async (req: Request, res: Response) => {
    const { franchise, season } = req.query;
    if (!franchise || !season) {
        return res.status(400).json({ Error: 'franchise and season are required' });
    }
    try {
        const brackets = await prisma.bracket.findMany({
            where: { franchise: String(franchise), season: Number(season) },
            select: { bracketName: true, queens: true },
            orderBy: { bracketName: 'asc' },
        });
        return res.status(200).json(brackets);
    } catch (error) {
        logger.error('Admin.Controller.ts: getAdminBrackets() - failed', { error });
        return res.status(500).json({ Error: 'Failed to fetch brackets' });
    }
};

// Doc: Returns queens for a franchise/season to populate the admin weekly update form.
// Doc: Query: ?franchise=&season=
// Doc: Route: GET /admin/queens
export const getAdminQueens = async (req: Request, res: Response) => {
    const { franchise, season } = req.query;
    if (!franchise || !season) {
        return res.status(400).json({ Error: 'franchise and season are required' });
    }
    try {
        const queens = await prisma.queen.findMany({
            where: { franchise: String(franchise), season: Number(season) },
            select: { name: true, status: true },
            orderBy: { name: 'asc' },
        });
        return res.status(200).json(queens);
    } catch (error) {
        logger.error('Admin.Controller.ts: getAdminQueens() - failed', { error });
        return res.status(500).json({ Error: 'Failed to fetch queens' });
    }
};

// Doc: Queries every table in the database and returns the full dump as a JSON object.
// Doc: User password hashes are omitted from the dump.
// Doc: Route: GET /admin/dump  (protected by protectAdmin)
export const dumpDatabase = async (_req: Request, res: Response) => {
    logger.info('Admin.Controller.ts: dumpDatabase() - starting full database dump');

    try {
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
                fanSurveys:             { count: fanSurveys.length,             records: fanSurveys },
                fanSurveyData:          { count: fanSurveyData.length,          records: fanSurveyData },
                seasonFinaleResponses:  { count: seasonFinaleResponses.length,  records: seasonFinaleResponses },
                episodeResults:         { count: episodeResults.length,         records: episodeResults },
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
        fanSurveys           = { records: [] },
        fanSurveyData        = { records: [] },
        seasonFinaleResponses = { records: [] },
    } = tables;

    try {
        // Placeholder hash for restored users — passwords were stripped from the dump.
        const placeholderPassword = await bcrypt.hash('RESTORE_PLACEHOLDER', 10);

        // Wipe every table first (child tables before parents to respect FK constraints).
        await prisma.$transaction([
            prisma.seasonFinaleResponse.deleteMany(),
            prisma.fanSurveyData.deleteMany(),
            prisma.fanSurvey.deleteMany(),
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

        // Reset auto-increment sequences so the next insert doesn't collide with restored IDs.
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE((SELECT MAX(id) FROM "User"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"League"', 'id'), COALESCE((SELECT MAX(id) FROM "League"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Roster"', 'recordId'), COALESCE((SELECT MAX("recordId") FROM "Roster"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Notification"', 'notifId'), COALESCE((SELECT MAX("notifId") FROM "Notification"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Queen"', 'queenId'), COALESCE((SELECT MAX("queenId") FROM "Queen"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"ActiveSeasons"', 'seasonId'), COALESCE((SELECT MAX("seasonId") FROM "ActiveSeasons"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Bracket"', 'bracketId'), COALESCE((SELECT MAX("bracketId") FROM "Bracket"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"FanSurvey"', 'id'), COALESCE((SELECT MAX(id) FROM "FanSurvey"), 1))`;
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"FanSurveyData"', 'id'), COALESCE((SELECT MAX(id) FROM "FanSurveyData"), 1))`;
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

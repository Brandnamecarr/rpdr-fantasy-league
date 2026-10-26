import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import prisma from '../db/prisma.client';
import logger from '../util/logger/LoggerImpl';
import * as leagueOpsService from '../services/leagueOps.service';
import * as leagueService from '../services/league.service';
import * as logService from '../services/log.service';
import * as workflowService from '../services/workflow.service';
import * as adminService from '../services/admin.service';
import { generateToken, ADMIN_EMAILS } from '../util/credentials/TokenManager';
import { RestoreDatabaseBody, RestoreFromBackupBody } from '../types/Interfaces';

// Doc: Parses a date query param — matches the convention in activeSeasons.controller.ts (accepts MM-DD-YYYY).
const parseDateField = (value?: string): Date | undefined => {
    if (!value) return undefined;
    const [month, day, year] = value.split('-').map(Number);
    if (!month || !day || !year) return undefined;
    return new Date(year, month - 1, day);
};

// Doc: Returns all users (id, email, displayName, createdAt) — passwords excluded.
// Doc: Route: GET /admin/users
export const getAllUsers = async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, displayName: true, createdAt: true, isAdmin: true },
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

// Doc: Mints a short-lived user JWT for whichever real user's email is in the ADMIN_EMAIL allowlist
// Doc: (comma-separated for multiple admins), so the admin panel (which only holds the static admin
// Doc: key) can call JWT-protected (`protect`) routes it doesn't have a dedicated protectAdmin mirror
// Doc: for. Access to this endpoint is itself gated by protectAdmin, so no password check is needed
// Doc: here — the admin key already proved who's asking. If multiple ADMIN_EMAIL addresses have
// Doc: matching accounts, the first match is used.
// Doc: Route: GET /admin/getJwt
export const getAdminJwt = async (_req: Request, res: Response) => {
    try {
        const admin = await prisma.user.findFirst({ where: { email: { in: ADMIN_EMAILS } } });
        if (!admin) {
            logger.error('Admin.Controller.ts: getAdminJwt() - no user matching ADMIN_EMAIL found');
            return res.status(404).json({ Error: 'No admin account found — create a user with an email listed in ADMIN_EMAIL' });
        }
        const token = generateToken({ id: admin.id, email: admin.email });
        return res.status(200).json({ token });
    } catch (error) {
        logger.error('Admin.Controller.ts: getAdminJwt() - failed', { error });
        return res.status(500).json({ Error: 'Failed to mint admin JWT' });
    }
};

// Doc: Deletes a league and cleans up any rosters associated with it. There is no user-facing
// Doc: button for this (destructive, irreversible) — it's meant to be called directly by
// Doc: whoever holds the admin key.
// Doc: Body: { leagueName: string }
// Doc: Route: POST /admin/deleteLeague
export const deleteLeague = async (req: Request, res: Response) => {
    const { leagueName } = req.body;
    if (!leagueName) {
        return res.status(400).json({ Error: 'leagueName is required' });
    }
    try {
        const result = await leagueService.deleteLeague(leagueName);
        if (!result) {
            return res.status(404).json({ Error: `League '${leagueName}' not found` });
        }
        logger.info('Admin.Controller.ts: deleteLeague() - league deleted', { leagueName, deletedRosters: result.deletedRosters });
        return res.status(200).json({ message: `League '${leagueName}' deleted`, deletedRosters: result.deletedRosters });
    } catch (error) {
        logger.error('Admin.Controller.ts: deleteLeague() - failed', { error, leagueName });
        return res.status(500).json({ Error: 'Failed to delete league' });
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

// Doc: Returns the list of table names the admin database viewer can select from (its dropdown options).
// Doc: Route: GET /admin/tables  (protected by protectAdmin)
export const getAdminTableNames = async (_req: Request, res: Response) => {
    try {
        return res.status(200).json(adminService.listTableNames());
    } catch (error) {
        logger.error('Admin.Controller.ts: getAdminTableNames() - failed', { error });
        return res.status(500).json({ Error: 'Failed to list tables' });
    }
};

// Doc: Returns every record of one table, via that table's fetchAll() in the admin.service registry.
// Doc: Route: GET /admin/tables/:table  (protected by protectAdmin)
export const getAdminTableRecords = async (req: Request, res: Response) => {
    const { table } = req.params;
    try {
        const records = await adminService.fetchTableRecords(table);
        if (!records) {
            return res.status(404).json({ Error: `Unknown table '${table}'` });
        }
        return res.status(200).json({ table, count: records.length, records });
    } catch (error) {
        logger.error('Admin.Controller.ts: getAdminTableRecords() - failed', { error, table });
        return res.status(500).json({ Error: 'Failed to fetch table records' });
    }
};

// Doc: Queries every table in the database and returns the full dump as a JSON object.
// Doc: User password hashes are omitted from the dump.
// Doc: Route: GET /admin/dump  (protected by protectAdmin)
export const dumpDatabase = async (_req: Request, res: Response) => {
    logger.info('Admin.Controller.ts: dumpDatabase() - starting full database dump');

    try {
        const dump = await adminService.buildDatabaseDump();

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
export const restoreDatabase = async (req: Request<unknown, unknown, Partial<RestoreDatabaseBody>>, res: Response) => {
    logger.info('Admin.Controller.ts: restoreDatabase() - starting full database restore');

    const { tables } = req.body ?? {};
    if (!tables) {
        return res.status(400).json({ Error: 'Invalid dump format: missing tables object' });
    }

    try {
        await adminService.restoreDatabaseFromDump(tables);
        res.status(200).json({ message: 'Database restored successfully' });
    } catch (error) {
        logger.error('Admin.Controller.ts: restoreDatabase() - failed', { error });
        res.status(500).json({ Error: 'Failed to restore database' });
    }
};

// Doc: Restores the database from a JSON dump previously uploaded to S3 by the DatabaseBackup
// Doc: workflow, instead of requiring the dump to be POSTed directly. With no `date` in the body,
// Doc: restores the single most recent backup; with `date` (e.g. "2026-08-31"), restores the latest
// Doc: backup whose <date-time> folder name starts with it.
// Doc: Body: { date?: string }
// Doc: Route: POST /admin/restoreFromBackup  (protected by protectAdmin)
export const restoreDatabaseFromBackup = async (req: Request<unknown, unknown, RestoreFromBackupBody>, res: Response) => {
    const { date } = req.body ?? {};
    logger.info('Admin.Controller.ts: restoreDatabaseFromBackup() - starting restore from S3 backup', { date: date ?? 'latest' });

    try {
        const result = await adminService.restoreDatabaseFromBackup(date);
        if (!result) {
            const message = date ? `No database backup found matching '${date}'` : 'No database backups found';
            logger.error('Admin.Controller.ts: restoreDatabaseFromBackup() - no matching backup', { date });
            return res.status(404).json({ Error: message });
        }

        logger.info('Admin.Controller.ts: restoreDatabaseFromBackup() - restore complete', result);
        return res.status(200).json({
            message: 'Database restored from backup successfully',
            key: result.key,
            backupTimestamp: result.backupTimestamp,
        });
    } catch (error) {
        logger.error('Admin.Controller.ts: restoreDatabaseFromBackup() - failed', { error });
        return res.status(500).json({ Error: 'Failed to restore database from backup' });
    }
};

// Doc: Lists the <date-time> folder names of every database backup in S3 (newest last), so the admin
// Doc: panel can populate a "which backup?" dropdown for the Database Restore workflow.
// Doc: Route: GET /admin/backups  (protected by protectAdmin)
export const getBackupTimestamps = async (_req: Request, res: Response) => {
    try {
        const timestamps = await adminService.listBackupTimestamps();
        return res.status(200).json(timestamps);
    } catch (error) {
        logger.error('Admin.Controller.ts: getBackupTimestamps() - failed', { error });
        return res.status(500).json({ Error: 'Failed to list database backups' });
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

// Doc: Applies end-of-season league point awards (winner, runner-up) directly to rosters, bypassing the fan survey tally.
// Doc: Every other ACTIVE queen for that franchise/season is treated as eliminated (status + point penalty).
// Doc: Callers are expected to have already validated winner/runnerUp against the queens list (see /queens/getQueensByFranSeas),
// Doc: same convention as adminWeeklyUpdate — this route does not re-validate queen names or statuses.
// Doc: Body: { franchise: string, season: number, episode: number, winner: string[], runnerUp: string[] }
// Doc: Route: POST /admin/endOfSeasonUpdate  (protected by protectAdmin)
export const endOfSeasonUpdate = async (req: Request, res: Response) => {
    const { franchise, season, episode, winner, runnerUp } = req.body;

    if (!franchise || !season || !episode) {
        logger.error('Admin.Controller.ts: endOfSeasonUpdate() - missing franchise, season, or episode');
        return res.status(400).json({ Error: 'franchise, season, and episode are required' });
    }

    logger.info('Admin.Controller.ts: endOfSeasonUpdate() - request received', { franchise, season, episode, winner, runnerUp });

    try {
        const results = await leagueOpsService.endOfSeasonUpdate(
            franchise, Number(season), Number(episode),
            winner ?? [], runnerUp ?? []
        );
        if (!results) {
            logger.error('Admin.Controller.ts: endOfSeasonUpdate() - no rosters found', { franchise, season });
            return res.status(404).json({ Error: 'No rosters found for this franchise/season' });
        }
        logger.info('Admin.Controller.ts: endOfSeasonUpdate() - points applied', { updatedRosters: results.length, franchise, season, episode });
        return res.status(200).json({ updatedRosters: results.length, rosters: results });
    } catch (error) {
        logger.error('Admin.Controller.ts: endOfSeasonUpdate() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error applying end of season update' });
    }
};

// Doc: Starts a workflow's steps executing in the background and returns an execution id the
// Doc: client polls via getWorkflowStatus. The workflow itself runs fire-and-forget — a failing
// Doc: step never crashes this request or the server (see workflow.service.ts).
// Doc: Body: { workflowId: string, input?: object } — `input` is only needed by workflows that require it
// Doc: (e.g. LookFinder's franchise/season/episode); it's passed through untouched to every step's run().
// Doc: Route: POST /admin/workflows/execute  (protected by protectAdmin)
export const executeWorkflow = async (req: Request, res: Response) => {
    const { workflowId, input } = req.body;
    if (!workflowId) {
        return res.status(400).json({ Error: 'workflowId is required' });
    }
    try {
        const executionId = workflowService.startWorkflowExecution(workflowId, input);
        if (!executionId) {
            return res.status(404).json({ Error: 'Workflow not found' });
        }
        logger.info('Admin.Controller.ts: executeWorkflow() - workflow started', { workflowId, executionId });
        return res.status(201).json({ executionId });
    } catch (error) {
        logger.error('Admin.Controller.ts: executeWorkflow() - failed', { error, workflowId });
        return res.status(500).json({ Error: 'Failed to start workflow' });
    }
};

// Doc: Returns the current live status of a workflow execution (in-memory, polled by the admin
// Doc: panel's execution modal). 404s once the execution has never existed or has been evicted
// Doc: from the in-memory map after its 10-minute post-completion TTL.
// Doc: Route: GET /admin/workflows/status/:executionId  (protected by protectAdmin)
export const getWorkflowStatus = async (req: Request, res: Response) => {
    const { executionId } = req.params;
    try {
        const state = workflowService.getExecutionStatus(executionId);
        if (!state) {
            return res.status(404).json({ Error: 'Execution not found' });
        }
        return res.status(200).json(state);
    } catch (error) {
        logger.error('Admin.Controller.ts: getWorkflowStatus() - failed', { error, executionId });
        return res.status(500).json({ Error: 'Failed to fetch workflow status' });
    }
};

// Doc: Returns paginated, filterable log entries from logs/app.log for the admin log viewer.
// Doc: Query: ?level=&startDate=&endDate=&search=&page=&pageSize= (all optional; page defaults to 1, pageSize defaults to 100, max 500)
// Doc: Route: GET /admin/logs  (protected by protectAdmin)
export const getLogs = async (req: Request, res: Response) => {
    const { level, startDate, endDate, search } = req.query;

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 100));

    try {
        const result = logService.getLogEntries({
            level: level ? String(level) : undefined,
            startDate: parseDateField(startDate ? String(startDate) : undefined),
            endDate: parseDateField(endDate ? String(endDate) : undefined),
            search: search ? String(search) : undefined,
            page,
            pageSize,
        });

        return res.status(200).json({ entries: result.entries, total: result.total, page, pageSize });
    } catch (error) {
        logger.error('Admin.Controller.ts: getLogs() - failed', { error });
        return res.status(500).json({ Error: 'Failed to fetch logs' });
    }
};

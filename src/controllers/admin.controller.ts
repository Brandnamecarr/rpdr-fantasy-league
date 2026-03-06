import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../db/prisma.client';
import logger from '../util/LoggerImpl';

// Doc: Queries every table in the database, writes the result to ./dumps/<timestamp>.json
// Doc: on the server filesystem, and sends the same JSON as a file download in the response.
// Doc: User password hashes are omitted from the dump.
// Doc: Route: GET /admin/dump  (protected)
export const dumpDatabase = async (_req: Request, res: Response) => {
    logger.info('Admin.Controller.ts: dumpDatabase() - starting full database dump');

    try {
        const [rawUsers, leagues, rosters, notifications, queens, activeSeasons, fanSurveyResponses] =
            await Promise.all([
                prisma.user.findMany(),
                prisma.league.findMany(),
                prisma.roster.findMany(),
                prisma.notification.findMany(),
                prisma.queen.findMany(),
                prisma.activeSeasons.findMany(),
                prisma.fanSurveyResponse.findMany(),
            ]);

        // Strip password hashes — everything else is included as-is
        const users = rawUsers.map(({ password: _omit, ...rest }) => rest);

        const dump = {
            timestamp: new Date().toISOString(),
            tables: {
                users:              { count: users.length,              records: users },
                leagues:            { count: leagues.length,            records: leagues },
                rosters:            { count: rosters.length,            records: rosters },
                notifications:      { count: notifications.length,      records: notifications },
                queens:             { count: queens.length,             records: queens },
                activeSeasons:      { count: activeSeasons.length,      records: activeSeasons },
                fanSurveyResponses: { count: fanSurveyResponses.length, records: fanSurveyResponses },
            },
        };

        // Write to ./dumps/<timestamp>.json on the server filesystem
        const dumpsDir = path.join(process.cwd(), 'dumps');
        if (!fs.existsSync(dumpsDir)) {
            fs.mkdirSync(dumpsDir, { recursive: true });
        }
        const filename = `db-dump-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filepath = path.join(dumpsDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(dump, null, 2));

        logger.info('Admin.Controller.ts: dumpDatabase() - dump written', { filename });

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).json(dump);

    } catch (error) {
        logger.error('Admin.Controller.ts: dumpDatabase() - failed', { error });
        res.status(500).json({ Error: 'Failed to dump database' });
    }
};

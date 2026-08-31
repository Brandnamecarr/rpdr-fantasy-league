// Doc: DatabaseBackup dumps every table in the database (via admin.service.ts, the same logic behind
// Doc: GET /admin/dump) and uploads the JSON as a timestamped object in S3. `id` is the contract with
// Doc: the frontend (WorkflowsTab.tsx's hardcoded WORKFLOWS list) — keep it in sync if either side changes.
import logger from '../util/logger/LoggerImpl';
import { putFile } from '../util/aws/S3Manager';
import { buildDatabaseDump } from '../services/admin.service';
import { WorkflowDefinition } from '../types/Interfaces';

// Doc: Filesystem/S3-key-safe timestamp, e.g. "2026-08-31T14-05-22Z" (colons swapped for dashes).
const buildTimestamp = (): string => new Date().toISOString().replace(/:/g, '-');

// Doc: Step 1 — dumps the full database and uploads it to S3 at database_backup/<date-time>/dump.json.
async function backupDatabase(): Promise<string> {
    const dump = await buildDatabaseDump();
    const body = JSON.stringify(dump, null, 2);

    const key = `database_backup/${buildTimestamp()}/dump.json`;
    await putFile(key, body, 'application/json');

    logger.info('DatabaseBackup-L1-Backup: uploaded database dump', {
        key, tableCount: Object.keys(dump.tables).length, bytes: body.length,
    });
    return `Uploaded database dump (${Object.keys(dump.tables).length} tables) to ${key}`;
}

export const databaseBackup: WorkflowDefinition = {
    id: 'database-backup',
    name: 'Database Backup',
    steps: [
        { name: 'DatabaseBackup-L1-Backup', run: backupDatabase },
    ],
};

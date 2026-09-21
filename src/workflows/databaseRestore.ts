// Doc: DatabaseRestore downloads a specific database backup from S3 (as uploaded by the DatabaseBackup
// Doc: workflow) and restores it, wiping all tables first. `id` is the contract with the frontend
// Doc: (WorkflowsTab.tsx's hardcoded WORKFLOWS list) — keep it in sync if either side changes. Requires
// Doc: `input` (see DatabaseRestoreInput in types/Interfaces.ts) passed through POST /admin/workflows/execute
// Doc: — the frontend populates the choice of `date` from GET /admin/backups.
import logger from '../util/logger/LoggerImpl';
import { restoreDatabaseFromBackup } from '../services/admin.service';
import { WorkflowDefinition, WorkflowInput, DatabaseRestoreInput } from '../types/Interfaces';

// Doc: Narrows/validates the generic WorkflowInput bag into the backup `date` DatabaseRestore needs.
// Doc: Throws (failing the step, surfaced to the admin UI) if the required field is missing or malformed.
function parseDatabaseRestoreInput(input?: WorkflowInput): DatabaseRestoreInput {
    const date = input?.date;
    if (typeof date !== 'string' || !date) {
        throw new Error('DatabaseRestore requires a date (string) — see GET /admin/backups for available backups');
    }
    return { date };
}

// Doc: Step 1 — downloads the backup matching `date` from S3 and restores it, wiping all tables first.
// Doc: Throws (failing the step) if no backup matches.
async function restoreDatabase(input?: WorkflowInput): Promise<string> {
    const { date } = parseDatabaseRestoreInput(input);

    logger.info('DatabaseRestore-L1-Restore: restoring database from S3 backup', { date });
    const result = await restoreDatabaseFromBackup(date);
    if (!result) {
        throw new Error(`No database backup found matching '${date}'`);
    }

    logger.info('DatabaseRestore-L1-Restore: restore complete', result);
    return `Restored database from backup ${result.key}${result.backupTimestamp ? ` (dumped ${result.backupTimestamp})` : ''}`;
}

export const databaseRestore: WorkflowDefinition = {
    id: 'database-restore',
    name: 'Database Restore',
    steps: [
        { name: 'DatabaseRestore-L1-Restore', run: restoreDatabase },
    ],
};

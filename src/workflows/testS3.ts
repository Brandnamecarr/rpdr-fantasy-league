// Doc: Test workflow used to verify S3 connectivity end-to-end via the admin-panel workflow runner.
// Doc: `id` is the contract with the frontend (WorkflowsTab.tsx's hardcoded WORKFLOWS list) —
// Doc: keep it in sync if either side changes.
import logger from '../util/logger/LoggerImpl';
import { listKeys } from '../util/aws/S3Manager';
import { WorkflowDefinition } from '../types/Interfaces';

async function countS3Files(): Promise<string> {
    const keys = await listKeys();
    logger.info('Test-S3-L1: listed bucket objects', { count: keys.length });
    return `${keys.length} file(s) in the S3 bucket`;
}

export const testS3: WorkflowDefinition = {
    id: 'test-s3',
    name: 'Test S3',
    steps: [
        { name: 'Test-S3-L1', run: countS3Files },
    ],
};

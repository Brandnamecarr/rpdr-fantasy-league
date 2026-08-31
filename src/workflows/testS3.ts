// Doc: Test workflow used to verify S3 connectivity end-to-end via the admin-panel workflow runner.
// Doc: `id` is the contract with the frontend (WorkflowsTab.tsx's hardcoded WORKFLOWS list) —
// Doc: keep it in sync if either side changes.
import logger from '../util/logger/LoggerImpl';
import { getFile } from '../util/aws/S3Manager';
import { WorkflowDefinition } from '../types/Interfaces';

async function getS3TestFile(): Promise<string> {
    const file = await getFile('tests3.json');
    const contents = file.toString('utf-8');
    logger.info('Test-S3-L1: fetched tests3.json', { bytes: file.length });
    return contents;
}

export const testS3: WorkflowDefinition = {
    id: 'test-s3',
    name: 'Test S3',
    steps: [
        { name: 'Test-S3-L1', run: getS3TestFile },
    ],
};

// Doc: Test workflow used to verify the admin-panel workflow runner end-to-end.
// Doc: `id` is the contract with the frontend (WorkflowsTab.tsx's hardcoded WORKFLOWS list) —
// Doc: keep it in sync if either side changes.
import logger from '../util/logger/LoggerImpl';
import { WorkflowDefinition } from '../types/Interfaces';

export const testWorkflow: WorkflowDefinition = {
    id: 'test-workflow',
    name: 'Test Workflow',
    steps: [
        { name: 'Test-Workflow-L0', run: () => { logger.info('Test-Workflow-L0: hello'); return 'hello'; } },
        { name: 'Test-Workflow-L1', run: () => { logger.info('Test-Workflow-L1: my queen'); return 'my queen'; } },
    ],
};

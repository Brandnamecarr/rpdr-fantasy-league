// Doc: Static registry of runnable admin-panel workflows. Each workflow is defined in its own file
// Doc: in this directory and plugged into the WORKFLOWS list below; `run()` on each step does the
// Doc: actual work and is executed sequentially by workflow.service.ts.
// Doc: Steps should be short/idempotent-ish and log via `logger` (not console.log) so their output
// Doc: surfaces in the admin Logs tab (GET /admin/logs) as well as the live execution modal.
import { WorkflowDefinition } from '../types/Interfaces';
import { testWorkflow } from './testWorkflow';
import { testS3 } from './testS3';
import { lookFinder } from './lookFinder';
import { sendEmail } from './sendEmail';
import { databaseBackup } from './databaseBackup';

export const WORKFLOWS: WorkflowDefinition[] = [
    testWorkflow,
    testS3,
    lookFinder,
    sendEmail,
    databaseBackup,
];

// Doc: Looks up a workflow definition by id — returns undefined if it doesn't exist.
export const getWorkflowDefinition = (workflowId: string): WorkflowDefinition | undefined =>
    WORKFLOWS.find(w => w.id === workflowId);

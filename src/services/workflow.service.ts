// Doc: Workflow execution engine. Live per-step status lives only in an in-memory Map — the
// Doc: WorkflowExecutionResults table only stores the completed-record shape (name/started/finished/result),
// Doc: it is not used for "is it currently running" reads. Entries are evicted from the map some time
// Doc: after the workflow reaches a terminal state so the map doesn't grow unbounded over the life of
// Doc: the server process.
import { randomUUID } from 'crypto';
import prisma from '../db/prisma.client';
import logger from '../util/logger/LoggerImpl';
import { getWorkflowDefinition } from '../workflows/workflow.definitions';
import { ExecutionState, WorkflowInput } from '../types/Interfaces';

// Doc: executionId -> live execution state. Cleared out after EXECUTION_TTL_MS once terminal.
const executions = new Map<string, ExecutionState>();

const EXECUTION_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Doc: Starts a workflow's steps in the background (fire-and-forget) and returns immediately.
// Doc: Throws if the workflow id doesn't exist — callers (the controller) should look up the
// Doc: workflow first and translate that into a 404 rather than relying on this throwing.
const runWorkflow = async (executionId: string, workflowId: string, input?: WorkflowInput): Promise<void> => {
    const state = executions.get(executionId);
    const definition = getWorkflowDefinition(workflowId);
    if (!state || !definition) return;

    for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        state.steps[i].status = 'running';

        try {
            const result = await step.run(input);
            state.steps[i].status = 'success';
            state.steps[i].result = result ?? undefined;
        } catch (error) {
            state.steps[i].status = 'failed';
            state.steps[i].result = error instanceof Error ? error.message : String(error);
            state.overallStatus = 'failed';
            state.finishedAt = new Date();

            logger.error('Workflow.Service.ts: runWorkflow() - step failed, aborting remaining steps', {
                workflowId,
                workflowName: definition.name,
                stepName: step.name,
                error,
            });

            await persistResult(definition.name, state.startedAt, state.finishedAt, 'Failed');
            scheduleEviction(executionId);
            return;
        }
    }

    state.overallStatus = 'completed';
    state.finishedAt = new Date();
    logger.info('Workflow.Service.ts: runWorkflow() - workflow completed', {
        workflowId,
        workflowName: definition.name,
    });

    await persistResult(definition.name, state.startedAt, state.finishedAt, 'Completed');
    scheduleEviction(executionId);
};

// Doc: Writes the completed/failed record to WorkflowExecutionResults. Wrapped in try/catch since
// Doc: a DB write failure here must not crash the (already-detached) background runner.
const persistResult = async (name: string, startedAt: Date, finishedAt: Date, result: 'Completed' | 'Failed'): Promise<void> => {
    try {
        await prisma.workflowExecutionResults.create({
            data: { name, startedAt, finishedAt, result },
        });
    } catch (error) {
        logger.error('Workflow.Service.ts: persistResult() - failed to write WorkflowExecutionResults row', { name, result, error });
    }
};

const scheduleEviction = (executionId: string): void => {
    setTimeout(() => executions.delete(executionId), EXECUTION_TTL_MS);
};

// Doc: Looks up the workflow, seeds in-memory state (all steps pending), kicks off execution
// Doc: without awaiting it, and returns the generated execution id immediately.
// Doc: Returns undefined if the workflow id doesn't exist.
export const startWorkflowExecution = (workflowId: string, input?: WorkflowInput): string | undefined => {
    const definition = getWorkflowDefinition(workflowId);
    if (!definition) return undefined;

    const executionId = randomUUID();
    const state: ExecutionState = {
        workflowName: definition.name,
        steps: definition.steps.map(s => ({ name: s.name, status: 'pending' })),
        overallStatus: 'running',
        startedAt: new Date(),
    };
    executions.set(executionId, state);

    logger.info('Workflow.Service.ts: startWorkflowExecution() - workflow started', {
        workflowId,
        workflowName: definition.name,
        executionId,
    });

    // Fire-and-forget — a failing step is caught inside runWorkflow and must never crash the server.
    runWorkflow(executionId, workflowId, input).catch(error => {
        logger.error('Workflow.Service.ts: startWorkflowExecution() - unexpected error running workflow', { workflowId, executionId, error });
    });

    return executionId;
};

// Doc: Returns the current in-memory state for an execution id, or null if it never existed or has
// Doc: already been evicted after finishing (TTL expiry).
export const getExecutionStatus = (executionId: string): ExecutionState | null => {
    return executions.get(executionId) ?? null;
};

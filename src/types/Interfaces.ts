// Doc: Common TypeScript interfaces used throughout the application.
// Doc: Defines data structures for authentication, requests, and input payloads.
// Doc: HTTP request types (interfaces extending express.Request) live in ./CustomRequests instead.
import { QueenStatus } from "@prisma/client";

// Doc: Payload structure for JWT tokens containing user identification
// Doc: Properties: id (number) - user ID, email (string) - user email address
export interface UserTokenPayload {
    id: number;
    email: string;
}

// Doc: Input structure for creating new queen records
// Doc: Properties: name (string), franchise (string), season (number), location (string), status (QueenStatus)
export interface QueenInput {
    name: string;
    franchise: string;
    season: number;
    location: string;
    status: QueenStatus;
}

// Doc: Shape of a single parsed line from logs/app.log (see util/logger/LoggerImpl.ts).
// Doc: Properties: timestamp (ISO 8601 string), level ("ERROR" | "INFO" | "DEBUG"), service (string), message (string), context (arbitrary JSON object)
export interface LogEntry {
    timestamp: string;
    level: string;
    service: string;
    message: string;
    context: object;
}

// Doc: Input structure for creating new league records
// Doc: Properties: leaguename (string), owner (string), users (string[]), maxPlayers (number), maxQueensPerTeam (number), franchise (string), season (number), teamName (string), queens (string[])
export interface CreateLeagueInput {
    leaguename: string;
    owner: string;
    users: string[];
    maxPlayers: number;
    maxQueensPerTeam: number;
    franchise: string;
    season: number;
    teamName: string;
    queens: string[];
}

// Doc: Interface for custom logger implementations with error, info, and debug methods
// Doc: Methods: error(message, context?) - logs error messages, info(message, context?) - logs info messages, debug(message, context?) - logs debug messages
export interface CustomLogger {
    error(message: string, context?: object): void;
    info(message:string, context?: object): void;
    debug(message: string, content?: object): void;
}

// Doc: Filter/pagination options accepted by log.service.ts's getLogEntries.
export interface LogFilters {
    level?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page: number;
    pageSize: number;
}

// Doc: Result shape returned by getLogEntries — one page of entries plus the total match count.
export interface LogEntriesResult {
    entries: LogEntry[];
    total: number;
}

// Doc: Backend-tallied fan survey results for a single episode (plurality winner per category).
export interface TalliedEpisodeSurvey {
    episode: number;
    queenOfTheWeek: string[];
    bottomOfTheWeek: string[];
    lipSyncWinner: string[];
    bestDressed: string[];
    worstDressed: string[];
}

// Doc: Loosely-typed input bag threaded from POST /admin/workflows/execute's optional `input` body
// Doc: field through to every step's run(). Workflows that need input (see LookFinderInput below)
// Doc: are responsible for validating/narrowing their own shape out of this at the top of each step.
export type WorkflowInput = Record<string, unknown>;

// Doc: A single named, runnable step within an admin-panel workflow (see workflows/workflow.definitions.ts).
export interface WorkflowStepDefinition {
    name: string;
    // Doc: Returned string is surfaced to the client as the step's result, displayed under the
    // Doc: step in the execution modal. Return void if a step has no user-facing result to show.
    run: (input?: WorkflowInput) => string | void | Promise<string | void>;
}

// Doc: A registered admin-panel workflow — an ordered list of steps run sequentially by services/workflow.service.ts.
export interface WorkflowDefinition {
    id: string;
    name: string;
    steps: WorkflowStepDefinition[];
}

// Doc: Input required by the LookFinder workflow (src/workflows/lookFinder.ts) — the franchise/season/
// Doc: episode to scrape queen images for and validate against. Mirrored on the frontend in WorkflowsTab.tsx.
export interface LookFinderInput {
    franchise: string;
    season: number;
    episode: number;
}

// Doc: Input required by the SendEmail workflow (src/workflows/sendEmail.ts). `target` picks the
// Doc: recipient list — "all-subscribers" needs no further fields (see the workflow's TODO — there's
// Doc: no subscriber data source yet), "league" requires franchise/season. Mirrored on the frontend
// Doc: in WorkflowsTab.tsx.
export interface SendEmailInput {
    target: 'all-subscribers' | 'league';
    franchise?: string;
    season?: number;
    subject: string;
    message: string;
}

// Doc: Live status of a single workflow step, or of a workflow execution as a whole.
export type StepStatus = 'pending' | 'running' | 'success' | 'failed';
export type OverallStatus = 'running' | 'completed' | 'failed';

// Doc: In-memory state for one step of a running/completed workflow execution.
export interface StepState {
    name: string;
    status: StepStatus;
    // Doc: On success, the step's returned string (if any). On failure, the error message.
    // Doc: Undefined while pending/running, or if a successful step returned void.
    result?: string;
}

// Doc: In-memory state for a workflow execution, keyed by executionId in workflow.service.ts.
export interface ExecutionState {
    workflowName: string;
    steps: StepState[];
    overallStatus: OverallStatus;
    startedAt: Date;
    finishedAt?: Date;
}

// Doc: A single file to upload via S3Manager's putFiles().
export interface S3FileInput {
    key: string;
    body: Buffer | Uint8Array | string;
    contentType?: string;
}
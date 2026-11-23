// Doc: HTTP API type definitions: custom Express Request types, request bodies, and response shapes.
// Doc: Extends base Express Request types with specific body structures for different endpoints.
// Doc: Internal (non-HTTP) types live in ./domain-types instead.
import {Request} from 'express';
import { QueenStatus, BracketName, User, League, Roster, LeagueHistory, RosterHistory, Notification, NotificationType, Queen, ActiveSeasons, Bracket, FanSurvey, FanSurveyData, SeasonFinaleResponse, EpisodeResult } from "@prisma/client";
import { UserTokenPayload, LogEntry } from './domain-types';

export interface LoginRequest extends Request {
    body: {
        email?: string;
        password?: string;
    };
}

// Doc: Extended Express Request with authenticated user information
// Doc: Properties: user (UserTokenPayload?) - optional decoded JWT payload attached by auth middleware
// Doc: Generic ReqBody param lets callers type req.body (e.g. AuthRequest<UpdateDisplayNameBody>)
// Doc: instead of falling back to Request's default `any` body type. Defaults to `unknown` so a
// Doc: caller that doesn't need a typed body still can't destructure it without narrowing first.
export interface AuthRequest<ReqBody = unknown> extends Request<Record<string, string>, unknown, ReqBody> {
    user?: UserTokenPayload;
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

// Doc: Input structure for creating new league records
// Doc: Properties: leagueName (string), owner (string), users (string[]), maxPlayers (number), maxQueensPerTeam (number), franchise (string), season (number), teamName (string), queens (string[])
export interface CreateLeagueInput {
    leagueName: string;
    owner: string;
    users: string[];
    maxPlayers: number;
    maxQueensPerTeam: number;
    franchise: string;
    season: number;
    teamName: string;
    queens: string[];
}

// Doc: Result shape returned by getLogEntries — one page of entries plus the total match count.
export interface LogEntriesResult {
    entries: LogEntry[];
    total: number;
}

// Doc: Request body for POST /leagueOps/weeklyUpdate and POST /admin/weeklyUpdate — shared shape
// Doc: since the admin route is a key-protected mirror of the same operation.
export interface WeeklyUpdateBody {
    franchise: string;
    season: number;
    episode: number;
    maxiWinner: string[];
    isSnatchGame: boolean;
    miniWinner: string[];
    topQueens: string[];
    safeQueens: string[];
    bottomQueens: string[];
    lipSyncWinner: string[];
    eliminated: string[];
    bracketName?: BracketName;
}

// Doc: Request body for POST /leagueOps/weeklySurvey.
export interface WeeklySurveyBody {
    franchise: string;
    season: number;
    toots: string[];
    boots: string[];
    iconicQueens: string[];
    cringeQueens: string[];
    queenOfTheWeek: string[];
    bracketName?: BracketName;
}

// Doc: Request body for POST /leagueOps/addUserToLeague.
export interface AddUserToLeagueBody {
    username: string;
    teamName: string;
    leagueName: string;
    queens: string[];
    franchise: string;
    season: number;
}

// Doc: Request body for POST /leagueOps/removeUserFromLeague.
export interface RemoveUserFromLeagueBody {
    email: string;
    leagueName: string;
    franchise: string;
    season: number;
}

// Doc: Request body for POST /leagueOps/rosters/league (getAllRostersByLeague).
export interface GetRostersByLeagueBody {
    leagueName: string;
}

// Doc: Request body for POST /leagueOps/openFanSurvey. startDate/endDate arrive as ISO strings
// Doc: (or are omitted, in which case the controller defaults them).
export interface OpenFanSurveyBody {
    franchise: string;
    season: number;
    episode: number;
    startDate?: string;
    endDate?: string;
}

// Doc: Request body for POST /leagueOps/submitFanSurvey.
export interface SubmitFanSurveyBody {
    franchise: string;
    season: number;
    episode: number;
    queenOfTheWeek: string;
    bottomOfTheWeek: string;
    lipSyncWinner: string;
    bestDressed: string;
    worstDressed: string;
}

// Doc: Request body for POST /leagueOps/computeFanSurvey.
export interface ComputeFanSurveyBody {
    franchise: string;
    season: number;
    episode: number;
    bracketName?: BracketName;
}

// Doc: Request body for POST /leagueOps/submitSeasonFinale.
export interface SubmitSeasonFinaleBody {
    franchise: string;
    season: number;
    winner: string;
    runnerUp: string;
    missCongeniality: string;
    bestDressed: string;
    fanFavorite: string;
    tradeOfTheSeason: string;
    mostImproved: string;
}

// Doc: Request body for POST /leagueOps/increaseLeagueSize.
export interface IncreaseLeagueSizeBody {
    leagueName: string;
    franchise: string;
    season: number;
    newMaxPlayers: number;
}

// Doc: Request body for PATCH /users/displayName.
export interface UpdateDisplayNameBody {
    displayName: string;
}

// Doc: Request body shared by GET-notification-style endpoints (getUserNotifs, getAllActiveNotifs)
// Doc: that accept the target email in the body rather than deriving it solely from the JWT.
export interface GetNotifsForEmailBody {
    email: string;
}

// Doc: Request body for POST /notifications (makeNewNotification). type/joinRequestId are optional
// Doc: and default to GENERIC/null (see notification.service.ts's makeNewNotification) so existing
// Doc: callers of this route keep working unchanged.
export interface MakeNewNotificationBody {
    source: string;
    destination: string;
    content: string;
    type?: NotificationType;
    joinRequestId?: number | null;
}

// Doc: Request body for updating a notification's resolved status.
export interface UpdateNotifStatusBody {
    notifId: number;
}

// Doc: Request body for POST /leagueOps/requestToJoinLeague. requestingEmail comes from the JWT, not the body.
export interface RequestToJoinLeagueBody {
    leagueName: string;
    franchise: string;
    season: number;
    teamName: string;
    queens: string[];
}

// Doc: Request body for POST /leagueOps/approveJoinRequest and POST /leagueOps/denyJoinRequest.
export interface JoinRequestIdBody {
    requestId: number;
}

// Doc: One table's worth of records in a database dump/restore payload (see admin.service.ts's
// Doc: buildDatabaseDump and admin.controller.ts's restoreDatabase, which must stay in sync).
export interface DumpTable<T> {
    count?: number;
    records: T[];
}

// Doc: Request body for POST /admin/dump (restoreDatabase) — mirrors buildDatabaseDump()'s output
// Doc: shape. Users are restored with a placeholder password, so records omit the password hash.
export interface RestoreDatabaseBody {
    tables: {
        users?: DumpTable<Omit<User, 'password'>>;
        leagues?: DumpTable<League>;
        rosters?: DumpTable<Roster>;
        leagueHistory?: DumpTable<LeagueHistory>;
        rosterHistory?: DumpTable<RosterHistory>;
        notifications?: DumpTable<Notification>;
        queens?: DumpTable<Queen>;
        activeSeasons?: DumpTable<ActiveSeasons>;
        brackets?: DumpTable<Bracket>;
        fanSurveys?: DumpTable<FanSurvey>;
        fanSurveyData?: DumpTable<FanSurveyData>;
        seasonFinaleResponses?: DumpTable<SeasonFinaleResponse>;
        episodeResults?: DumpTable<EpisodeResult>;
    };
}

// Doc: Cached membership status returned by GET /subscription/status — read straight from the
// Doc: User row, no live Stripe call. Mirrors the fields written by the (not-yet-implemented)
// Doc: Stripe webhook handler in subscription.service.ts.
export interface SubscriptionStatus {
    hasActiveMembership: boolean;
    membershipCancelAtPeriodEnd: boolean;
    membershipRenewsAt: Date | null;
}

// Doc: Request body for POST /admin/restoreFromBackup — restores the database from a JSON dump
// Doc: previously uploaded to S3 by the DatabaseBackup workflow (database_backup/<date-time>/dump.json).
// Doc: `date` is optional and matches against the start of a backup's <date-time> folder name
// Doc: (e.g. "2026-08-31" matches any backup taken that day, picking the latest); omitted entirely,
// Doc: the single most recent backup across all dates is used.
export interface RestoreFromBackupBody {
    date?: string;
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoster = exports.computeFanSurvey = exports.submitFanSurvey = exports.getRostersByFranchiseAndSeason = exports.getAllRosters = exports.getAllRostersByLeague = exports.removeUserFromLeague = exports.addUserToLeague = exports.weeklySurvey = exports.weeklyUpdate = void 0;
const leagueOpsService = __importStar(require("../services/leagueOps.service"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
const leagueService = __importStar(require("../services/league.service"));
// Doc: Processes weekly episode results and updates point totals for all affected rosters.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number, maxiWinner: string, isSnatchGame: boolean, miniWinner: string, topQueens: string[], safeQueens: string[], bottomQueens: string[], linSyncWinner: string, eliminated: string[]}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/weekly-update
const weeklyUpdate = async (req, res) => {
    const { franchise, season, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated } = req.body;
    LoggerImpl_1.default.info('LeagueOps.Controller.ts: weeklyUpdate() - request received', { franchise, season, maxiWinner, isSnatchGame, eliminated });
    try {
        const resp = await leagueOpsService.weeklyUpdate(franchise, season, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated);
        if (!resp) {
            LoggerImpl_1.default.error('LeagueOps.Controller.ts: Error in weeklyUpdate(), unable to update points');
            return res.status(404).json({ Error: 'Error performing weeklyUpdate operations' });
        }
        LoggerImpl_1.default.info('LeagueOps.Controller.ts: successfully updated point totals, returning 201');
        return res.status(201).json(resp);
    }
    catch (error) {
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: error in weeklyUpdate(): ', { error: error });
        return res.status(500).json({ error: 'Error processing weekly update' });
    }
};
exports.weeklyUpdate = weeklyUpdate;
// Doc: Processes weekly survey results including toots, boots, iconic/cringe queens, and queen of the week.
// Doc: Args: req (Request) - Express request object with body containing {toots: any[], boots: any[], iconicQueens: any[], cringeQueens: any[], queenOfTheWeek: any}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/weekly-survey
const weeklySurvey = async (req, res) => {
    const { toots, boots, iconicQueens, cringeQueens, queenOfTheWeek } = req.body;
    LoggerImpl_1.default.info('LeagueOps.Controller.ts: weeklySurvey() - request received', { tootCount: toots?.length, bootCount: boots?.length, queenOfTheWeek });
    try {
        let resp = await leagueOpsService.weeklySurvey(toots, boots, iconicQueens, cringeQueens, queenOfTheWeek);
        if (!resp) {
            LoggerImpl_1.default.error('LeagueOps.Controller.ts: got back null from weeklySurvey, returning 404');
            return res.status(404).json({ Error: "Error with weeklySurvey" });
        }
        LoggerImpl_1.default.info('LeagueOps.Controller.ts: successfully performed weeklySurvey update, returning 201');
        return res.status(201).json(resp);
    }
    catch (error) {
        LoggerImpl_1.default.debug('leagueOps.Controller.ts: Error with Weekly Survey', { error: error });
        return res.status(500).json({ error: error });
    }
};
exports.weeklySurvey = weeklySurvey;
// Doc: Adds a user to an existing league with their team name and selected queens.
// Doc: Args: req (Request) - Express request object with body containing {username: string, teamName: string, leagueName: string, queens: any[], franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/add-user
const addUserToLeague = async (req, res) => {
    const { username, teamName, leagueName, queens, franchise, season } = req.body;
    LoggerImpl_1.default.debug('LeagueOps.Controller.ts: addUserToLeague() called with: ', { username, teamName, leagueName, franchise, season });
    try {
        const result = await leagueService.getLeague(leagueName, franchise, season);
        if (!result) {
            return res.status(404).json({
                "Error": "League not found in database"
            });
        }
        let league = result;
        LoggerImpl_1.default.debug('LeagueOps.Controller.ts: Found league: ', { leagueName: league.leagueName });
        const resp = await leagueOpsService.addUserToLeague(username, teamName, league, queens, league.franchise, league.season);
        if (!resp) {
            return res.status(400).json({ Error: `Error adding ${username} to ${leagueName}` });
        }
        res.status(201).json(resp);
    }
    catch (error) {
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: error in addUserToLeague(): ', { error: error });
        res.status(500).json({ error: 'User unable to add to league' });
    }
};
exports.addUserToLeague = addUserToLeague;
// Doc: Removes a user from an existing league.
// Doc: Args: req (Request) - Express request object with body containing {email: string, leagueName: string, franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely DELETE /league-ops/remove-user or POST /league-ops/remove-user
const removeUserFromLeague = async (req, res) => {
    const { email, leagueName, franchise, season } = req.body;
    LoggerImpl_1.default.info('LeagueOps.Controller.ts: removeUserFromLeague() - request received', { email, leagueName, franchise, season });
    try {
        const result = await leagueService.getLeague(leagueName, franchise, season);
        if (!result) {
            LoggerImpl_1.default.error('LeagueOps.Controller.ts: removeUserFromLeague() - league not found', { leagueName, franchise, season });
            return res.status(404).json({
                "Error": "League not found in database"
            });
        } //if //
        let league = result;
        LoggerImpl_1.default.debug('LeagueOps.Controller.ts: removeUserFromLeague() - found league, calling service', { leagueName: league.leagueName, email });
        const resp = await leagueOpsService.removeUserFromLeague(email, league);
        LoggerImpl_1.default.info('LeagueOps.Controller.ts: removeUserFromLeague() - completed successfully', { email, leagueName });
        res.status(200).json(resp);
    }
    catch (error) {
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: removeUserFromLeague() - unexpected error', { email, leagueName, error });
        res.status(500).json({ error: 'Unable to remove user from league' });
    }
};
exports.removeUserFromLeague = removeUserFromLeague;
// Doc: Retrieves all team rosters for a specific league.
// Doc: Args: req (Request) - Express request object with body containing {email: string, token: string, leagueName: string}, res (Response) - Express response object
// Doc: Route: Likely GET /league-ops/rosters/league or POST /league-ops/rosters/league
const getAllRostersByLeague = async (req, res) => {
    //i think token gets used in the routes file //
    // might not need to pass in //
    const { email, token, leagueName } = req.body;
    LoggerImpl_1.default.debug('LeagueOps.Controller.ts: Finding roster for league: ', { leagueName: leagueName });
    try {
        const result = await leagueOpsService.getAllRostersByLeague(leagueName);
        LoggerImpl_1.default.debug('LeagueOps.Controller.ts: Got back result: ', { result: result });
        if (!result) {
            LoggerImpl_1.default.debug(`LeagueOps.Controller.ts: No rosters found for league ${leagueName}`, {});
            res.status(404).json({ "Error": `"No rosters found for league ${leagueName}"` });
        } // if //
        LoggerImpl_1.default.debug('LeagueOps.Controller.ts: Returning 201');
        res.status(201).json(result);
    } // try // 
    catch (error) {
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: error in getAllRostersByLeague: ', { error: error });
        res.status(500).json({
            "Error": { error }
        });
    } // catch //
};
exports.getAllRostersByLeague = getAllRostersByLeague;
// Doc: Retrieves all rosters from the database (for internal/testing purposes).
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /league-ops/rosters
const getAllRosters = async (req, res) => {
    LoggerImpl_1.default.debug('LeagueOps.Controller.ts: getAllRosters() - request received');
    try {
        let response = await leagueOpsService.getAllRosters();
        if (!response) {
            LoggerImpl_1.default.error('LeagueOps.Controller.ts: getAllRosters() - no rosters returned from service');
            res.status(404).json({ "Error": "No rosters found in database" });
        }
        LoggerImpl_1.default.debug('LeagueOps.Controller.ts: getAllRosters() - returning all rosters', { count: response?.length });
        res.status(201).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: getAllRosters() - unexpected error', { error: error });
        res.status(500).json({ error: error });
    }
};
exports.getAllRosters = getAllRosters;
// Doc: Retrieves all rosters filtered by specific franchise and season.
// Doc: Args: req (Request) - Express request object with query parameters franchise (string) and season (number), res (Response) - Express response object
// Doc: Route: Likely GET /league-ops/rosters?franchise=US&season=16
const getRostersByFranchiseAndSeason = async (req, res) => {
    const franchise = req.query.franchise || undefined;
    const seasonParam = req.query.season;
    const season = Number(seasonParam) || -1;
    if (!franchise || season === -1) {
        LoggerImpl_1.default.error(`LeagueOps.Controller.ts: Invalid params ${franchise} or ${seasonParam} in getRosterByFranchiseAndSeason`);
        return res.status(404).json({ Error: `Invalid params ${franchise} or ${seasonParam} in getRosterByFranchiseAndSeason` });
    }
    try {
        let rosters = await leagueOpsService.getRostersByFranchiseAndLeague(franchise, season);
        if (!rosters) {
            LoggerImpl_1.default.error(`LeagueOps.Controller.ts: Error getting rosters by franchise and season from database`);
            return res.status(404).json({ Error: "Error getting rosters from database" });
        }
        LoggerImpl_1.default.debug(`LeagueOps.Controller.ts: got rosters matching franchise and season from table`);
        res.status(201).json(rosters);
    }
    catch (error) {
        LoggerImpl_1.default.error(`LeagueOps.Controller.ts: Error getting rosters by franchise and season`);
        res.status(500).json({ Error: 'Error getting rosters by franchise and season' });
    }
};
exports.getRostersByFranchiseAndSeason = getRostersByFranchiseAndSeason;
// Doc: Stores an individual fan survey response for a specific episode.
// Doc: Body: {franchise, season, episode, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed}
// Doc: Route: POST /leagueOps/submitFanSurvey
const submitFanSurvey = async (req, res) => {
    const { franchise, season, episode, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed } = req.body;
    const submittedBy = req.user?.email;
    if (!franchise || !season || !episode || !queenOfTheWeek || !bottomOfTheWeek || !lipSyncWinner || !bestDressed || !worstDressed) {
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: submitFanSurvey() - missing required fields');
        return res.status(400).json({ Error: 'All survey fields are required' });
    }
    LoggerImpl_1.default.info('LeagueOps.Controller.ts: submitFanSurvey() - request received', { franchise, season, episode, submittedBy });
    try {
        const resp = await leagueOpsService.submitFanSurvey(franchise, Number(season), Number(episode), submittedBy, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed);
        LoggerImpl_1.default.info('LeagueOps.Controller.ts: submitFanSurvey() - response stored successfully');
        return res.status(201).json(resp);
    }
    catch (error) {
        if (error?.code === 'P2002') {
            LoggerImpl_1.default.error('LeagueOps.Controller.ts: submitFanSurvey() - duplicate submission', { submittedBy, franchise, season, episode });
            return res.status(409).json({ Error: 'You have already submitted a survey for this episode' });
        }
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: submitFanSurvey() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error submitting fan survey' });
    }
};
exports.submitFanSurvey = submitFanSurvey;
// Doc: Tallies fan survey votes for an episode and applies point adjustments to all rosters.
// Doc: Body: {franchise, season, episode} — should only be called after the Friday-Thursday window closes.
// Doc: Route: POST /leagueOps/computeFanSurvey
const computeFanSurvey = async (req, res) => {
    const { franchise, season, episode } = req.body;
    if (!franchise || !season || !episode) {
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: computeFanSurvey() - missing required fields');
        return res.status(400).json({ Error: 'franchise, season, and episode are required' });
    }
    LoggerImpl_1.default.info('LeagueOps.Controller.ts: computeFanSurvey() - request received', { franchise, season, episode });
    try {
        const resp = await leagueOpsService.computeFanSurvey(franchise, Number(season), Number(episode));
        if (!resp) {
            LoggerImpl_1.default.error('LeagueOps.Controller.ts: computeFanSurvey() - no responses or rosters found');
            return res.status(404).json({ Error: 'No survey responses found for this episode' });
        }
        LoggerImpl_1.default.info('LeagueOps.Controller.ts: computeFanSurvey() - points applied successfully', { updatedRosters: resp.length });
        return res.status(201).json({ updatedRosters: resp.length, rosters: resp });
    }
    catch (error) {
        LoggerImpl_1.default.error('LeagueOps.Controller.ts: computeFanSurvey() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error computing fan survey results' });
    }
};
exports.computeFanSurvey = computeFanSurvey;
// Doc: Creates and adds a new roster record to the database.
// Doc: Args: req (Request) - Express request object with body containing {leagueName: string, email: string, teamName: string, queens: any[], franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/rosters
const addRoster = async (req, res) => {
    const { leagueName, email, teamName, queens, franchise, season } = req.body;
    try {
        let result = await leagueOpsService.addNewRoster(leagueName, email, teamName, queens, franchise, season);
        if (!result) {
            LoggerImpl_1.default.error('leagueOps.Controller.ts: error adding new roster record into database');
            return res.status(404).json({ Error: 'Error making new roster obj in database' });
        }
        LoggerImpl_1.default.debug('leagueOps.Controller.ts: successfully added new record, returning result: ', { result: result });
        res.status(201).json(result);
    }
    catch (error) {
        LoggerImpl_1.default.error('leagueOps.Controller.ts: addRoster error: ', { error: error });
        res.status(500).json({ "Error": error });
    }
};
exports.addRoster = addRoster;

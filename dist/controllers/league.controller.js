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
exports.getAvailByFranAndSeason = exports.getInactiveLeaguesByUser = exports.getAvailableLeagues = exports.createLeague = exports.getLeaguesByUser = exports.getAllLeagues = exports.getLeague = void 0;
const leagueService = __importStar(require("../services/league.service"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Retrieves a specific league record by league name, franchise, and season.
// Doc: Args: req (Request) - Express request object with body containing {leagueName: string, franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /league or POST /league/get
const getLeague = async (req, res) => {
    const { leagueName, franchise, season } = req.body;
    LoggerImpl_1.default.debug('League.Controller.ts: getLeague() with param: ', { leagueName: leagueName, franchise: franchise, season: season });
    try {
        const leagueRecord = await leagueService.getLeague(leagueName, franchise, season);
        if (!leagueRecord) {
            LoggerImpl_1.default.error('League.Controller.ts: did not get any records back');
            return res.status(404).json({ "Error": `Did not find any leagues with name ${leagueName}` });
        }
        LoggerImpl_1.default.debug('League.Controller.ts: successfully loaded record from database', {});
        res.json(leagueRecord);
    } // try //
    catch (error) {
        LoggerImpl_1.default.error('League.Controller.ts: error loading record returning 500: ', { error: error });
        res.status(500).json({ error: 'Error getting league by name' });
    }
};
exports.getLeague = getLeague;
// Doc: Retrieves all leagues from the database (mostly for internal testing purposes).
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /leagues
const getAllLeagues = async (req, res) => {
    try {
        const leagues = await leagueService.getAllLeagues();
        if (!leagues) {
            return res.status(404).json({ error: `Didn't find any leagues in database` });
        }
        LoggerImpl_1.default.debug('League.Controller.ts: returning all leagues in getAllLeagues()', {});
        res.status(200).json(leagues);
    } // try //
    catch (error) {
        LoggerImpl_1.default.error('League.Controller.ts: Error fetching all leagues: ', { error: error });
        res.status(500).json({ error: 'Error getting all leagues' });
    }
};
exports.getAllLeagues = getAllLeagues;
// Doc: Retrieves all leagues that a specific user is a member of.
// Doc: Args: req (Request) - Express request object with query parameter email (string), res (Response) - Express response object
// Doc: Route: Likely GET /leagues/user?email=example@email.com
const getLeaguesByUser = async (req, res) => {
    const email = req?.query?.email || undefined;
    if (!email) {
        LoggerImpl_1.default.error("League.Controller.ts: email not in getLeaguesByUser query");
        return res.status(400).json({ Error: "Email required in query params." });
    }
    try {
        let response = await leagueService.getLeaguesByUser(email);
        if (!response) {
            return res.status(404).json({ Error: `No Leagues found for ${email}` });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('League.Controller.ts: error in getLeaguesByUser(): ', { error: error });
        res.status(500).json({ Error: `Error completing getLeaguesByUser for ${email}` });
    }
};
exports.getLeaguesByUser = getLeaguesByUser;
// Doc: Creates a new league with the specified settings and adds the owner to the users array.
// Doc: Args: req (Request) - Express request object with body containing {leagueName: string, owner: string, users: string[], maxPlayers: number, maxQueensPerTeam: number, teamName: string, franchise: string, season: number, queens: any[]}, res (Response) - Express response object
// Doc: Route: Likely POST /leagues
const createLeague = async (req, res) => {
    const { leagueName, owner, users, maxPlayers, maxQueensPerTeam, teamName, franchise, season, queens } = req.body;
    // guard rail to make sure owner ends up in the user array //
    if (!users.includes(owner)) {
        users.push(owner);
    }
    LoggerImpl_1.default.debug('League.Controller.ts: payload in createLeague(): ', { leaguename: leagueName, owner: owner, users: users, maxPlayers: maxPlayers, maxQueensPerTeam: maxQueensPerTeam, franchise: franchise, season: season });
    try {
        const league = await leagueService.createLeague(leagueName, owner, users, maxPlayers, maxQueensPerTeam, franchise, season, teamName, queens);
        LoggerImpl_1.default.debug('League.Controller.ts: creating league with status 201');
        LoggerImpl_1.default.debug('Created league: ', { league: league });
        res.status(201).json(league);
    }
    catch (error) {
        LoggerImpl_1.default.error('League.Controller.ts: Error creating league: ', { error: error });
        res.status(500).json({ Error: 'Error creating league' });
    }
};
exports.createLeague = createLeague;
// Doc: Fetches all leagues that have available spots (where length of users < maxPlayers).
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /leagues/available
const getAvailableLeagues = async (req, res) => {
    LoggerImpl_1.default.debug('League.Controller.ts: getAvailableLeagues() ', {});
    try {
        const response = await leagueService.getAvailableLeagues();
        LoggerImpl_1.default.debug('League.Controller.ts: got payload from database ', { payload: response });
        res.status(200).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('League.Controller.ts: Error creating league: ', { error: error });
        res.status(500).json({ Error: error });
    }
};
exports.getAvailableLeagues = getAvailableLeagues;
// Doc: Fetches all leagues a user is in whose franchise/season combo is INACTIVE in ActiveSeasons.
// Doc: Args: req (Request) - Express request with query param email (string), res (Response) - Express response object
// Doc: Route: GET /league/inactiveUserLeagues?email=user@example.com
const getInactiveLeaguesByUser = async (req, res) => {
    const email = req?.query?.email || undefined;
    if (!email) {
        LoggerImpl_1.default.error("League.Controller.ts: email not in getInactiveLeaguesByUser query");
        return res.status(400).json({ Error: "Email required in query params." });
    }
    try {
        const response = await leagueService.getInactiveLeaguesByUser(email);
        return res.status(200).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('League.Controller.ts: error in getInactiveLeaguesByUser(): ', { error });
        res.status(500).json({ Error: `Error completing getInactiveLeaguesByUser for ${email}` });
    }
};
exports.getInactiveLeaguesByUser = getInactiveLeaguesByUser;
// Doc: Fetches available leagues filtered by specific franchise and season.
// Doc: Args: req (Request) - Express request object with query parameters franchise (string) and season (number), res (Response) - Express response object
// Doc: Route: Likely GET /leagues/available?franchise=US&season=16
const getAvailByFranAndSeason = async (req, res) => {
    const franchise = req.query.franchise || undefined;
    const seasonParam = req.query.season || undefined;
    let season = Number(seasonParam) || -1;
    if (!franchise || season === -1) {
        LoggerImpl_1.default.error('League.Controller.ts: Invalid arguments provided: ', { franchise: franchise, season: season });
        return res.status(400).json({ Error: `Invalid args provided in query` });
    }
    try {
        let leagues = await leagueService.getAvailByFranAndSeason(franchise, season);
        if (!leagues) {
            return res.status(404).json({ Error: `Unable to find available leagues for ${franchise} and ${season}` });
        }
        res.status(200).json(leagues);
    }
    catch (error) {
        LoggerImpl_1.default.error('League.Controller.ts: getAvailByFranAndSeason() -> error getting avail leagues');
        res.status(500).json({ Error: error, Desc: `Failed to get by ${franchise} and ${season}` });
    }
};
exports.getAvailByFranAndSeason = getAvailByFranAndSeason;

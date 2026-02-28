import { Request, Response } from "express";
import * as leagueService from "../services/league.service";
import logger from "../util/LoggerImpl";

// Doc: Retrieves a specific league record by league name, franchise, and season.
// Doc: Args: req (Request) - Express request object with body containing {leagueName: string, franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /league or POST /league/get
export const getLeague = async (req: Request, res: Response) => {
    const {leagueName, franchise, season} = req.body;
    logger.debug('League.Controller.ts: getLeague() with param: ', {leagueName: leagueName, franchise: franchise, season: season});
    try {
        const leagueRecord = await leagueService.getLeague(leagueName, franchise, season);
        if(!leagueRecord) {
            logger.error('League.Controller.ts: did not get any records back');
            return res.status(404).json({"Error":`Did not find any leagues with name ${leagueName}`});
        }
        logger.debug('League.Controller.ts: successfully loaded record from database', {});
        res.json(leagueRecord);
    } // try //
    catch (error) {
        logger.error('League.Controller.ts: error loading record returning 500: ', {error: error});
        res.status(500).json({error: 'Error getting league by name'});
    }
};

// Doc: Retrieves all leagues from the database (mostly for internal testing purposes).
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /leagues
export const getAllLeagues = async (req: Request, res: Response) => {
    try {
        const leagues = await leagueService.getAllLeagues();
        if(!leagues) {
            return res.status(404).json({error: `Didn't find any leagues in database`});
        }
        logger.debug('League.Controller.ts: returning all leagues in getAllLeagues()', {});
        res.status(200).json(leagues);
    } // try //
    catch (error) {
        logger.error('League.Controller.ts: Error fetching all leagues: ', {error: error});
        res.status(500).json({error: 'Error getting all leagues'});
    }
};

// Doc: Retrieves all leagues that a specific user is a member of.
// Doc: Args: req (Request) - Express request object with query parameter email (string), res (Response) - Express response object
// Doc: Route: Likely GET /leagues/user?email=example@email.com
export const getLeaguesByUser = async (req: Request, res: Response) => {
    const email = req?.query?.email as string || undefined;
    if(!email) {
        logger.error("League.Controller.ts: email not in getLeaguesByUser query");
        return res.status(400).json({Error: "Email required in query params."});
    }
    try {
        let response = await leagueService.getLeaguesByUser(email);
        if(!response) {
            return res.status(404).json({Error: `No Leagues found for ${email}`})
        }
        return res.status(200).json(response);
    } catch(error) {
        logger.error('League.Controller.ts: error in getLeaguesByUser(): ', {error: error});
        res.status(500).json({Error: `Error completing getLeaguesByUser for ${email}`});
    }
};

// Doc: Creates a new league with the specified settings and adds the owner to the users array.
// Doc: Args: req (Request) - Express request object with body containing {leagueName: string, owner: string, users: string[], maxPlayers: number, maxQueensPerTeam: number, teamName: string, franchise: string, season: number, queens: any[]}, res (Response) - Express response object
// Doc: Route: Likely POST /leagues
export const createLeague = async (req: Request, res: Response) => {
    const {leagueName, owner, users, maxPlayers, maxQueensPerTeam, teamName, franchise, season, queens} = req.body;

    // guard rail to make sure owner ends up in the user array //
    if(!users.includes(owner)) {
        users.push(owner);
    }

    logger.debug('League.Controller.ts: payload in createLeague(): ', {leaguename: leagueName, owner: owner, users: users, maxPlayers:maxPlayers, maxQueensPerTeam:maxQueensPerTeam, franchise: franchise, season: season});
    try {
        const league = await leagueService.createLeague(leagueName, owner, users, maxPlayers, maxQueensPerTeam, franchise, season, teamName, queens);
        logger.debug('League.Controller.ts: creating league with status 201');
        logger.debug('Created league: ', {league: league});
        res.status(201).json(league);
    } catch (error) {
        logger.error('League.Controller.ts: Error creating league: ', {error: error});
        res.status(500).json({Error: 'Error creating league'});
    }
};

// Doc: Fetches all leagues that have available spots (where length of users < maxPlayers).
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /leagues/available
export const getAvailableLeagues = async (req: Request, res: Response) => {
    logger.debug('League.Controller.ts: getAvailableLeagues() ', {});
    try {
        const response = await leagueService.getAvailableLeagues();
        logger.debug('League.Controller.ts: got payload from database ', {payload: response});
        res.status(200).json(response);
    } catch(error) {
        logger.error('League.Controller.ts: Error creating league: ', {error: error});
        res.status(500).json({Error: error});
    }
};

// Doc: Fetches all leagues a user is in whose franchise/season combo is INACTIVE in ActiveSeasons.
// Doc: Args: req (Request) - Express request with query param email (string), res (Response) - Express response object
// Doc: Route: GET /league/inactiveUserLeagues?email=user@example.com
export const getInactiveLeaguesByUser = async (req: Request, res: Response) => {
    const email = req?.query?.email as string || undefined;
    if (!email) {
        logger.error("League.Controller.ts: email not in getInactiveLeaguesByUser query");
        return res.status(400).json({ Error: "Email required in query params." });
    }
    try {
        const response = await leagueService.getInactiveLeaguesByUser(email);
        return res.status(200).json(response);
    } catch (error) {
        logger.error('League.Controller.ts: error in getInactiveLeaguesByUser(): ', { error });
        res.status(500).json({ Error: `Error completing getInactiveLeaguesByUser for ${email}` });
    }
};

// Doc: Fetches available leagues filtered by specific franchise and season.
// Doc: Args: req (Request) - Express request object with query parameters franchise (string) and season (number), res (Response) - Express response object
// Doc: Route: Likely GET /leagues/available?franchise=US&season=16
export const getAvailByFranAndSeason = async (req: Request, res: Response) => {
    const franchise = req.query.franchise as string || undefined;
    const seasonParam = req.query.season as string || undefined;

    let season: number = Number(seasonParam) || -1;
    if(!franchise || season === -1) {
        logger.error('League.Controller.ts: Invalid arguments provided: ', {franchise:franchise, season:season});
        return res.status(400).json({Error: `Invalid args provided in query`});
    }
    try {
        let leagues = await leagueService.getAvailByFranAndSeason(franchise, season);
        if(!leagues) {
            return res.status(404).json({Error: `Unable to find available leagues for ${franchise} and ${season}`});
        }
        res.status(200).json(leagues);
    } catch(error) {
        logger.error('League.Controller.ts: getAvailByFranAndSeason() -> error getting avail leagues');
        res.status(500).json({Error: error, Desc: `Failed to get by ${franchise} and ${season}`});
    }
};
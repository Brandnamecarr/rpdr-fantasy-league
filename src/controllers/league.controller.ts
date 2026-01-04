import { Request, Response } from "express";
import * as leagueService from "../services/league.service";
import logger from "../util/LoggerImpl";

// get record of specific league //
export const getLeague = async (req: Request, res: Response) => {
    const {leagueName, franchise, season} = req.body;
    console.log({leagueName, franchise, season});
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
        console.log(error);
        logger.error('League.Controller.ts: error loading record returning 500: ', {error: error});
        res.status(500).json({error: 'Error getting league by name'});
    }
};

// get all leagues //
// mostly internal for testing //
// return status code response anyway //
export const getAllLeagues = async (req: Request, res: Response) => {
    try {
        const leagues = await leagueService.getAllLeagues();
        if(!leagues) {
            return res.status(404).json({error: `Didn't find any leagues in database`});
        }
        logger.debug('League.Controller.ts: returning all leagues in getAllLeagues()', {});
        res.status(201).json(leagues);
    } // try //
    catch (error) {
        logger.error('League.Controller.ts: Error fetching all leagues: ', {error: error});
        res.status(500).json({error: 'Error getting all leagues'});
    }
};

// gets all the leagues a user is a part of //
export const getLeaguesByUser = async (req: Request, res: Response) => {
    const email = req?.query?.email as string || undefined;
    if(!email) {
        logger.error("League.Controller.ts: email not in getLeaguesByUser query");
        return res.status(404).json({Error: "Email required in query params."});
    }
    try {
        let response = await leagueService.getLeaguesByUser(email);
        if(!response) {
            return res.status(404).json({Error: `No Leagues found for ${email}`})
        }
        return res.status(201).json(response);
    } catch(error) {
        logger.error('League.Controller.ts: error in getLeaguesByUser(): ', {error: error});
        res.status(500).json({Error: `Error completing getLeaguesByUser for ${email}`});
    }
};

// create new league //
export const createLeague = async (req: Request, res: Response) => {
    const {leagueName, owner, users, maxPlayers, maxQueensPerTeam, franchise, season} = req.body;

    // guard rail to make sure owner ends up in the user array //
    if(!users.includes(owner)) {
        users.push(owner);
    }

    logger.debug('League.Controller.ts: payload in createLeague(): ', {leaguename: leagueName, owner: owner, users: users, maxPlayers:maxPlayers, maxQueensPerTeam:maxQueensPerTeam, franchise: franchise, season: season});
    try {
        const league = await leagueService.createLeague(leagueName, owner, users, maxPlayers, maxQueensPerTeam, franchise, season);
        logger.debug('League.Controller.ts: creating league with status 201');
        logger.debug('Created league: ', {league: league});
        res.status(201).json(league);
    } catch (error) {
        logger.error('League.Controller.ts: Error creating league: ', {error: error});
        res.status(500).json({Error: 'Error creating league'});
    }
};

// fetches all leagues where length(users) < maxPlayers
export const getAvailableLeagues = async (req: Request, res: Response) => {
    logger.debug('League.Controller.ts: getAvailableLeagues() ', {});
    try {
        const response = await leagueService.getAvailableLeagues();
        logger.debug('League.Controller.ts: got payload from database ', {payload: response});
        res.status(201).json(response);
    } catch(error) {
        logger.error('League.Controller.ts: Error creating league: ', {error: error});
        res.status(500).json({Error: error});
    }
};

export const getAvailByFranAndSeason = async (req: Request, res: Response) => {
    const franchise = req.query.franchise as string || undefined;
    const seasonParam = req.query.season as string || undefined;

    let season: number = Number(seasonParam) || -1;
    if(!franchise || season === -1) {
        logger.error('League.Controller.ts: Invalid arguments provided: ', {franchise:franchise, season:season});
        return res.status(404).json({Error: `Invalid args provided in query`});
    }
    try {
        let leagues = await leagueService.getAvailByFranAndSeason(franchise, season);
        if(!leagues) {
            return res.status(404).json({Error: `Unable to find available leagues for ${franchise} and ${season}`});
        }
        res.status(201).json(leagues);
    } catch(error) {
        logger.error('League.Controller.ts: getAvailByFranAndSeason() -> error getting avail leagues');
        res.status(500).json({Error: error, Desc: `Failed to get by ${franchise} and ${season}`});
    }
};
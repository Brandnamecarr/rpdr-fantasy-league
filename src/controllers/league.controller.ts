import { Request, Response } from "express";
import * as leagueService from "../services/league.service";
import logger from "../util/LoggerImpl";

// get record of specific league //
export const getLeague = async (req: Request, res: Response) => {
    const {leaguename} = req.body;
    logger.info('League.Controller.ts: getLeague() with param: ', {leagueName: leaguename});
    try {
        const leagueRecord = await leagueService.getLeague(leaguename);
        logger.info('League.Controller.ts: successfully loaded record from database', {});
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
        logger.info('League.Controller.ts: returning all leagues in getAllLeagues()', {});
        res.status(201).json(leagues);
    } // try //
    catch (error) {
        console.log(error);
        logger.error('League.Controller.ts: Error fetching all leagues: ', {error: error});
        res.status(500).json({error: 'Error getting all leagues'});
    }
};

// create new league //
export const createLeague = async (req: Request, res: Response) => {
    // TODO: replace datapoints with league data points
    const {leagueName, owner, users, maxPlayers} = req.body;
    console.log(leagueName);
    console.log(owner);
    console.log(users);
    console.log(maxPlayers);
    logger.info('League.Controller.ts: payload in createLeague(): ', {leaguename: leagueName, owner: owner, users: users, maxPlayers:maxPlayers});
    try {
        const league = await leagueService.createLeague(leagueName, owner, users, maxPlayers);
        logger.info('League.Controller.ts: creating league with status 201');
        logger.info('Created league: ', {league: league});
        res.status(201).json(league);
    } catch (error) {
        console.error(error);
        logger.error('League.Controller.ts: Error creating league: ', {error: error});
        res.status(500).json({error: 'Error creating league'});
    }
};

// fetches all leagues where length(users) < maxPlayers
export const getAvailableLeagues = async (req: Request, res: Response) => {
    logger.info('League.Controller.ts: getAvailableLeagues() ', {});
    try {
        const response = await leagueService.getAvailableLeagues();
        logger.info('League.Controller.ts: got payload from database ', {payload: response});
        res.status(201).json(response);
    } catch(error) {
        logger.error('League.Controller.ts: Error creating league: ', {error: error});
        res.status(500).json({error: error});
    }
};
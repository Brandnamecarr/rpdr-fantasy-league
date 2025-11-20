import { Request, Response } from "express";
import * as leagueService from "../services/league.service";
import logger from "../util/LoggerImpl";

// get record of specific league //
export const getLeague = async (req: Request, res: Response) => {
    const {leaguename} = req.body;
    try {
        const leagueRecord = await leagueService.getLeague(leaguename);
        res.json(leagueRecord);
    } // try //
    catch (error) {
        console.log(error);
        res.status(500).json({error: 'Error getting league by name'});
    }
    
};

// get all leagues //
// mostly internal for testing //
// return status code response anyway //
export const getAllLeagues = async (req: Request, res: Response) => {
    try {
        const leagues = await leagueService.getAllLeagues();
        res.status(201).json(leagues);
    } // try //
    catch (error) {
        console.log(error);
        res.status(500).json({error: 'Error getting all leagues'});
    }
};

// create new league //
export const createLeague = async (req: Request, res: Response) => {
    // TODO: replace datapoints with league data points
    const {datapoints} = req.body;
    try {
        const league = await leagueService.createLeague(datapoints);
        res.status(201).json(league);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Error creating league'});
    }
};

// add user to league //
export const addUserToLeague = async (req: Request, res: Response) => {
    const {username, leaguename} = req.body;
    try {
        const resp = await leagueService.addUserToLeague(username, leaguename);
        res.status(201).json(resp);
    } catch(error) {
        console.error(error);
        res.status(404).json({error: 'User unable to add to league'});
    }
};

// remove user from league //
export const removeUserFromLeague = async (req: Request, res: Response) => {
    const {username, leaguename} = req.body;
    try {
        const resp = await leagueService.removeUserFromLeague(username, leaguename);
        res.status(201).json(resp);
    } catch (error) {
        console.error(error);
        res.status(404).json({error: 'Unable to remove user from league'});
    }
};
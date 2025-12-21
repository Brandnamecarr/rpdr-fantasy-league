import { Request, Response } from "express";
import * as leagueOpsService from '../services/leagueOps.service';
import logger from "../util/LoggerImpl";
import * as leagueService from '../services/league.service';

import {League, User, Roster} from '@prisma/client';

// weekly update //
export const weeklyUpdate = async (req: Request, res: Response) => {
    const {maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated} = req.body;

    try {
        const resp = await leagueOpsService.weeklyUpdate(maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated);
        res.status(201).json(resp);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Error processing weekly update'});
    }
};

// weekly survey //
export const weeklySurvey = async (req: Request, res: Response) => {
    const {toots, boots, iconicQueens, cringeQueens, queenOfTheWeek} = req.body;

    try {
        const resp = await leagueOpsService.weeklySurvey(toots, boots, iconicQueens, cringeQueens, queenOfTheWeek);
        res.status(201).json(resp);
    } catch (error) {
        logger.debug('leagueOps.Controller.ts: Error with Weekly Survey', {error: error});
        res.status(500).json({error: error});
    }
};



// add user to league //
export const addUserToLeague = async (req: Request, res: Response) => {
    const {email, teamName, leagueName, queens} = req.body;
    try {
        const result = await leagueService.getLeague(leagueName);
        if(!result) {
            return res.status(404).json({
                "Error": "League not found in database"
            });
        }
        let league: League = result;
        console.log(league);
        const resp = await leagueOpsService.addUserToLeague(email, teamName, league, queens);
        res.status(201).json({message:"TODO"});
    } catch(error) {
        console.error(error);
        res.status(404).json({error: 'User unable to add to league'});
    }
};

// remove user from league //
export const removeUserFromLeague = async (req: Request, res: Response) => {
    const {email, leagueName} = req.body;
    try {
        const result = await leagueService.getLeague(leagueName);
        if(!result) {
            return res.status(404).json({
                "Error": "League not found in database"
            });
        } //if //
        let league:League = result;
        const resp = await leagueOpsService.removeUserFromLeague(email, league);
        res.status(201).json(resp);
    } catch (error) {
        console.error(error);
        res.status(404).json({error: 'Unable to remove user from league'});
    }
};

// gets all rosters by league //
export const getAllRostersByLeague = async (req: Request, res: Response) => {
    //i think token gets used in the routes file //
    // might not need to pass in //
    const {email, token, leagueName} = req.body;
    logger.debug('LeagueOps.Controller.ts: Finding roster for league: ', {leagueName: leagueName});
    try {
        const result = await leagueOpsService.getAllRostersByLeague(leagueName);
        logger.debug('LeagueOps.Controller.ts: Got back result: ', {result: result});
        if(!result) {
            logger.debug(`LeagueOps.Controller.ts: No rosters found for league ${leagueName}`, {});
            res.status(404).json({"Error": `"No rosters found for league ${leagueName}"`});
        } // if //
        logger.debug('LeagueOps.Controller.ts: Returning 201');
        res.status(201).json(result);
    } // try // 
    catch(error) {
        logger.error('LeagueOps.Controller.ts: error in getAllRostersByLeague: ', {error: error});
        res.status(500).json({
            "Error": {error}
        });
    } // catch //
};

export const getAllRosters = async (req: Request, res: Response) => {
    try {
        let response = await leagueOpsService.getAllRosters();
        if(!response) {
            res.status(404).json({"Error": "No rosters found in database"});
        }
        res.status(201).json(response);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: Error in getAllRosters: ', {error: error});
        res.status(500).json({error: error});
    }
};

// adds a roster to the db //
export const addRoster = async (req: Request, res: Response) => {
    const {leagueName, email, teamName, queens} = req.body;
    try {
        let result = await leagueOpsService.addNewRoster(leagueName, email, teamName, queens);
    } catch(error) {
        logger.error('leagueOps.Controller.ts: addRoster error: ', {error: error});
        res.status(500).json({"Error": error});
    }
};
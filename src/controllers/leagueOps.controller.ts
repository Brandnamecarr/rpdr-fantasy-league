import { Request, Response } from "express";
import * as leagueOpsService from '../services/leagueOps.service';
import logger from "../util/LoggerImpl";
import * as leagueService from '../services/league.service';

import {League, User, Roster} from '@prisma/client';

// weekly update //
export const weeklyUpdate = async (req: Request, res: Response) => {
    const {franchise, season, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated} = req.body;

    try {
        const resp = await leagueOpsService.weeklyUpdate(franchise, season, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated);
        if(!resp) {
            logger.error('LeagueOps.Controller.ts: Error in weeklyUpdate(), unable to update points');
            return res.status(404).json({Error: 'Error performing weeklyUpdate operations'});
        }
        logger.info('LeagueOps.Controller.ts: successfully updated point totals, returning 201');
        return res.status(201).json(resp);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: error in weeklyUpdate(): ', {error:error});
        return res.status(500).json({error: 'Error processing weekly update'});
    }
};

// weekly survey //
export const weeklySurvey = async (req: Request, res: Response) => {
    const {toots, boots, iconicQueens, cringeQueens, queenOfTheWeek} = req.body;

    try {
        let resp = await leagueOpsService.weeklySurvey(toots, boots, iconicQueens, cringeQueens, queenOfTheWeek);
        if(!resp) {
            logger.error('LeagueOps.Controller.ts: got back null from weeklySurvey, returning 404');
            return res.status(404).json({Error: "Error with weeklySurvey"});
        }
        logger.info('LeagueOps.Controller.ts: successfully performed weeklySurvey update, returning 201');
        return res.status(201).json(resp);
    } catch (error) {
        logger.debug('leagueOps.Controller.ts: Error with Weekly Survey', {error: error});
        return res.status(500).json({error: error});
    }
};

// add user to league //
export const addUserToLeague = async (req: Request, res: Response) => {
    const {email, teamName, leagueName, queens, franchise, season} = req.body;
    console.log({email, teamName, leagueName, queens, franchise, season});
    try {
        const result = await leagueService.getLeague(leagueName, franchise, season);
        if(!result) {
            return res.status(404).json({
                "Error": "League not found in database"
            });
        }
        let league: League = result;
        console.log(league);
        const resp = await leagueOpsService.addUserToLeague(email, teamName, league, queens, league.franchise, league.season);
        if(!resp) {
            return res.status(404).json({Error: `Error adding ${email} to ${leagueName}`});
        }
        res.status(201).json(resp);
    } catch(error) {
        console.error(error);
        res.status(404).json({error: 'User unable to add to league'});
    }
};

// remove user from league //
export const removeUserFromLeague = async (req: Request, res: Response) => {
    const {email, leagueName, franchise, season} = req.body;
    try {
        const result = await leagueService.getLeague(leagueName, franchise, season);
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

export const getRostersByFranchiseAndSeason = async (req: Request, res: Response) => {
    const franchise = req.query.franchise as string || undefined;
    const seasonParam = req.query.season;

    const season: number = Number(seasonParam) || -1;

    if(!franchise || season === -1) {
        logger.error(`LeagueOps.Controller.ts: Invalid params ${franchise} or ${seasonParam} in getRosterByFranchiseAndSeason`);
        return res.status(404).json({Error: `Invalid params ${franchise} or ${seasonParam} in getRosterByFranchiseAndSeason`});
    }
    
    try {
        let rosters = await leagueOpsService.getRostersByFranchiseAndLeague(franchise, season);
        if(!rosters) {
            logger.error(`LeagueOps.Controller.ts: Error getting rosters by franchise and season from database`);
            return res.status(404).json({Error: "Error getting rosters from database"});
        }
        logger.debug(`LeagueOps.Controller.ts: got rosters matching franchise and season from table`);
        res.status(201).json(rosters);
    } catch(error) {
        logger.error(`LeagueOps.Controller.ts: Error getting rosters by franchise and season`);
        res.status(500).json({Error: 'Error getting rosters by franchise and season'});
    }
};

// adds a roster to the db //
export const addRoster = async (req: Request, res: Response) => {
    const {leagueName, email, teamName, queens, franchise, season} = req.body;
    try {
        let result = await leagueOpsService.addNewRoster(leagueName, email, teamName, queens, franchise, season);
        if(!result) {
            logger.error('leagueOps.Controller.ts: error adding new roster record into database');
            return res.status(404).json({Error: 'Error making new roster obj in database'});
        }
        logger.debug('leagueOps.Controller.ts: successfully added new record, returning result: ', {result: result});
        res.status(201).json(result);
    } catch(error) {
        logger.error('leagueOps.Controller.ts: addRoster error: ', {error: error});
        res.status(500).json({"Error": error});
    }
};
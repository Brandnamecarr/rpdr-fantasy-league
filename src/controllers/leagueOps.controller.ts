import { Request, Response } from "express";
import * as leagueOpsService from '../services/leagueOps.service';
import logger from "../util/LoggerImpl";
import * as leagueService from '../services/league.service';

import {League, User, Roster} from '@prisma/client';

// weekly update //
export const weeklyUpdate = async (req: Request, res: Response) => {
    const {weekNumber} = req.body;

    try {
        const resp = await leagueOpsService.weeklyUpdate(weekNumber);
        res.status(201).json(resp);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Error processing weekly update'});
    }
};



// add user to league //
export const addUserToLeague = async (req: Request, res: Response) => {
    const {email, leagueName, queens} = req.body;
    try {
        const result = await leagueService.getLeague(leagueName);
        if(!result) {
            return res.status(404).json({
                "Error": "League not found in database"
            });
        }
        let league: League = result;
        console.log(league);
        const resp = await leagueOpsService.addUserToLeague(email, league, queens);
        res.status(201).json({message:"TODO"});
    } catch(error) {
        console.error(error);
        res.status(404).json({error: 'User unable to add to league'});
    }
};

// remove user from league //
export const removeUserFromLeague = async (req: Request, res: Response) => {
    const {username, leagueName} = req.body;
    try {
        const result = await leagueService.getLeague(leagueName);
        if(!result) {
            return res.status(404).json({
                "Error": "League not found in database"
            });
        } //if //
        let league:League = result;
        const resp = await leagueOpsService.removeUserFromLeague(ElementInternals, league);
        res.status(201).json(resp);
    } catch (error) {
        console.error(error);
        res.status(404).json({error: 'Unable to remove user from league'});
    }
};
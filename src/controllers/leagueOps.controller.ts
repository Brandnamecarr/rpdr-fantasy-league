import { Request, Response } from "express";
import * as leagueOpsService from '../services/leagueOps.service';
import logger from "../util/LoggerImpl";

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
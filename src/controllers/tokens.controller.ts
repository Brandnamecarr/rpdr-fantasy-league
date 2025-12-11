import { Request, Response } from "express";
import * as tokenService from '../services/token.service';
import logger from "../util/LoggerImpl";

export const getToken = async(req: Request, res: Response) => {
    const {email} = req.body;

    try {

    } catch(error) {
        logger.error('Tokens.Controller.ts: Error in getToken(): ', {error: error});
        res.status(500).json({error: error});
    }
}; // getToken //


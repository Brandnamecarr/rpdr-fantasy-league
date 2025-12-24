import { Request, Response } from "express";
import * as queenService from '../services/queen.service';
import logger from "../util/LoggerImpl";

export const getAllQueens = async (req: Request, res: Response) => {
    try {
        let queens = await queenService.getAllQueens();
        if(!queens) {
            return res.status(404).json({Error: "Error fetching all queens"});
        }
        res.status(201).json({queens});
    } catch(error) {
        logger.error('Queen.Controller.ts: Error getting all queens: ', {error: error});
        res.status(500).json({Error: error});
    }
};

export const getQueenByName = async (req: Request, res: Response) => {
    const name = req?.query?.name || undefined;
    try {
        let queenRecord = await queenService.getQueenByName(name);
    } catch(error) {
        
    }
};

export const getQueensByFranchiseAndEpisode = (req: Request, res: Response) => {
    try {
        
    } catch(error) {
        
    }
};

// POST //
export const addNewQueen = (req: Request, res: Response) => {
    try {
        
    } catch(error) {
        
    }
};

export const addNewQueens = (req: Request, res: Response) => {
    try {
        
    } catch(error) {
        
    }
};

export const updateQueenStatus = (req: Request, res: Response) => {
    try {
        
    } catch(error) {
        
    }
};
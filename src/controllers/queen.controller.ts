import { Request, Response } from "express";
import * as queenService from '../services/queen.service';
import logger from "../util/LoggerImpl";
import * as INTERFACES from '../types/Interfaces';
import { QueenStatus } from "@prisma/client";

// returns entire contents of table //
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

// returns all records matching the queen name//
export const getQueenByName = async (req: Request, res: Response) => {
    const name = req.query.name as string | undefined;

    if(!name) {
        return res.status(400).json({Error: 'Name is required'});
    }

    try {
        let queenRecord = await queenService.getQueenByName(name);
        if(!queenRecord) {
            return res.status(404).json({Error: `Error getting records for ${name}`});
        }
        res.status(201).json(queenRecord);
    } catch(error) {
        logger.error("Queen.Controller.ts: Error getting Queen by name: ", {Error: error});
        res.status(500).json({Error: 'Error getting Queen by name'});
    }
};

// takes franchise/season/name and returns all matching records //
// (including status)
export const getQueenStatus = async(req:Request, res: Response) => {
    const franchiseParam = req.query.franchise;
    const seasonParam = req.query.season;
    const nameParam = req.query.name;

    const franchise: string = String(franchiseParam) || '';
    const season: number = Number(seasonParam) || -1;
    const name: string = String(nameParam) || '';

    if(franchise === '' || name === '' || season === -1) {
        return res.status(404).json({Error: `Got bad args in query ${franchiseParam}, ${seasonParam}, ${nameParam}`});
    }

    try {
        const queen = await queenService.getQueenStatus(franchise, season, name);
        if(!queen) {
            return res.status(404).json({Error: "No queen found matching params"});
        }
        res.status(201).json(queen);
    } catch(erorr) {
        res.status(500).json({Error: "Error with getQueenStatus()"});
    }
};

// returns ALL Queens by Franchise and Season //
export const getByFranchiseAndSeason = async (req: Request, res: Response) => {
    const franchiseParam = req.query.franchise;
    const seasonParam = req.query.season;
    
    const franchise: string = String(franchiseParam) || '';
    const season: number = Number(seasonParam) || -1;

    if(franchise === '' || season === -1) {
        logger.error('Queen.Controller.ts: Bad args in getByFranchiseAndSeason');
        return res.status(404).json({Error: `Got bad args in query ${franchiseParam}, ${seasonParam}`});
    }
    
    try {
        const queens = await queenService.getByFranchiseAndSeason(franchise, season);
        if(!queens) {
            logger.error('Queen.Controller.ts: Error getting by franchise and season');
            return res.status(404).json({Error: 'Error getting queens by Franchise and Season'});
        }
        res.status(201).json(queens);
    } catch(error) {
        logger.error('Queen.Controller.ts: Error in getByFranchiseAndSeason() -> ', {error: error});
        res.status(500).json({Error: error});
    }
};


// POST //
export const addNewQueen = async (req: Request, res: Response) => {
    const {name, franchise, season, status, location} = req.body as INTERFACES.QueenInput;
    let loc: string = '';
    if(!location) {
        loc = "UNKNOWN";
    }
    try {
        const response = await queenService.addNewQueen(name, franchise, season, location, status);
        if(!response) {
            return res.status(404).json({Error: "Unable to make queen matching params"});
        }
        return res.status(201).json(response);
    } catch(error) {
        res.status(500).json({Error: "Unable to insert queen into table"});
    }
};

export const addNewQueens = async (req: Request, res: Response) => {
    const queensData = req.body as INTERFACES.QueenInput[];

    if(!Array.isArray(queensData) || queensData.length == 0) {
        return res.status(404).json({Error: "Error with queensData input"});
    }

    try {
        let response = await queenService.addNewQueens(queensData);
        if(!response) {
            return res.status(404).json({Error: "Error adding list of Queens to Queen table"});
        }
        res.status(201).json(response);
    } catch(error) {
        res.status(500).json({Error: "Error inserting list of quenes"});
    }
};

export const updateQueenStatus = async (req: Request, res: Response) => {
    const {name, franchise, season, status} = req.body;
    try {
        let response = await queenService.updateQueenStatus(name, franchise, season, status);
        logger.info(`Queen.Controller.Ts: updateQueenStatus() -> response is ${response}`);
        if(!response) {
            return res.status(404).json({Error: `Error updating queen ${name} status to ${status}`});
        }
        res.status(201).json(response);
    } catch(error) {
        res.status(500).json({Error: `Error updating queen ${name} status`});
    }
};
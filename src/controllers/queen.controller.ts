import { Request, Response } from "express";
import * as queenService from '../services/queen.service';
import logger from "../util/LoggerImpl";
import * as INTERFACES from '../types/Interfaces';
import { QueenStatus } from "@prisma/client";

// Doc: Retrieves all queen records from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /queens
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

// Doc: Retrieves all queen records matching a specific name.
// Doc: Args: req (Request) - Express request object with query parameter name (string), res (Response) - Express response object
// Doc: Route: Likely GET /queens/name?name=QueenName
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

// Doc: Retrieves a queen's record and status by franchise, season, and name.
// Doc: Args: req (Request) - Express request object with query parameters franchise (string), season (number), and name (string), res (Response) - Express response object
// Doc: Route: Likely GET /queens/status?franchise=US&season=16&name=QueenName
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

// Doc: Retrieves all queens for a specific franchise and season.
// Doc: Args: req (Request) - Express request object with query parameters franchise (string) and season (number), res (Response) - Express response object
// Doc: Route: Likely GET /queens?franchise=US&season=16
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


// Doc: Adds a new queen record to the database.
// Doc: Args: req (Request) - Express request object with body containing {name: string, franchise: string, season: number, status: QueenStatus, location?: string}, res (Response) - Express response object
// Doc: Route: Likely POST /queens
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

// Doc: Adds multiple queen records to the database in bulk.
// Doc: Args: req (Request) - Express request object with body containing array of {name: string, franchise: string, season: number, status: QueenStatus, location?: string}[], res (Response) - Express response object
// Doc: Route: Likely POST /queens/bulk
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

// Doc: Updates a queen's status (e.g., ACTIVE, ELIMINATED, WINNER).
// Doc: Args: req (Request) - Express request object with body containing {name: string, franchise: string, season: number, status: QueenStatus}, res (Response) - Express response object
// Doc: Route: Likely PUT /queens/status or PATCH /queens/status
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

// Doc: Retrieves a queen's ID by franchise, season, and name.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number, name: string}, res (Response) - Express response object
// Doc: Route: Likely POST /queens/id or GET /queens/id
export const getQueenId = async (req: Request, res: Response) => {
    const {franchise, season, name} = req.body;

    if(franchise === '' || name === '') {
        logger.error('Queen.Controller.ts: bad parameters in request getQueenId');
        return res.status(404).json({Error: "Invalid parameters"});
    }
    try {
        let queenRecord = await queenService.findQueenId(franchise, season, name);
        if(!queenRecord) {
            logger.error('Queen.Controller.ts: unable to find queenID by specified parameters');
            return res.status(404).json({Error: "Unable to find queenID by specified parameters"});
        }
        logger.debug('Queen.Controller.ts: returning queenRecord from getQueenId()');
        res.status(201).json(queenRecord);
    } catch(error) {
        logger.error('Queen.Controller.ts: error in getQueenId: ', {error});
        res.status(500).json({Error: 'Error retrieving queenID'});
    }
};
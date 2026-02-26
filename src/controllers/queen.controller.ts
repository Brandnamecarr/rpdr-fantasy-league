import { Request, Response } from "express";
import * as queenService from '../services/queen.service';
import logger from "../util/LoggerImpl";
import * as INTERFACES from '../types/Interfaces';
import { QueenStatus } from "@prisma/client";

// Doc: Retrieves all queen records from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /queens
export const getAllQueens = async (req: Request, res: Response) => {
    logger.debug('Queen.Controller.ts: getAllQueens() - request received');
    try {
        let queens = await queenService.getAllQueens();
        if(!queens) {
            logger.error('Queen.Controller.ts: getAllQueens() - no queens returned from service');
            return res.status(404).json({Error: "Error fetching all queens"});
        }
        logger.debug('Queen.Controller.ts: getAllQueens() - returning queen records', {count: queens.length});
        res.status(201).json({queens});
    } catch(error) {
        logger.error('Queen.Controller.ts: getAllQueens() - unexpected error', {error: error});
        res.status(500).json({Error: error});
    }
};

// Doc: Retrieves all queen records matching a specific name.
// Doc: Args: req (Request) - Express request object with query parameter name (string), res (Response) - Express response object
// Doc: Route: Likely GET /queens/name?name=QueenName
export const getQueenByName = async (req: Request, res: Response) => {
    const name = req.query.name as string | undefined;
    logger.debug('Queen.Controller.ts: getQueenByName() - request received', {name});

    if(!name) {
        logger.error('Queen.Controller.ts: getQueenByName() - missing required query param: name');
        return res.status(400).json({Error: 'Name is required'});
    }

    try {
        let queenRecord = await queenService.getQueenByName(name);
        if(!queenRecord) {
            logger.error('Queen.Controller.ts: getQueenByName() - no records found for name', {name});
            return res.status(404).json({Error: `Error getting records for ${name}`});
        }
        logger.debug('Queen.Controller.ts: getQueenByName() - returning records', {name, count: queenRecord.length});
        res.status(201).json(queenRecord);
    } catch(error) {
        logger.error("Queen.Controller.ts: getQueenByName() - unexpected error", {name, error});
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

    logger.debug('Queen.Controller.ts: getQueenStatus() - request received', {franchise, season, name});

    if(franchise === '' || name === '' || season === -1) {
        logger.error('Queen.Controller.ts: getQueenStatus() - invalid query params', {franchise, season, name});
        return res.status(404).json({Error: `Got bad args in query ${franchiseParam}, ${seasonParam}, ${nameParam}`});
    }

    try {
        const queen = await queenService.getQueenStatus(franchise, season, name);
        if(!queen) {
            logger.error('Queen.Controller.ts: getQueenStatus() - no queen found matching params', {franchise, season, name});
            return res.status(404).json({Error: "No queen found matching params"});
        }
        logger.debug('Queen.Controller.ts: getQueenStatus() - returning queen record', {franchise, season, name});
        res.status(201).json(queen);
    } catch(erorr) {
        logger.error('Queen.Controller.ts: getQueenStatus() - unexpected error', {franchise, season, name, error: erorr});
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
    logger.debug('Queen.Controller.ts: addNewQueen() - request received', {name, franchise, season, status, location});
    let loc: string = '';
    if(!location) {
        loc = "UNKNOWN";
    }
    try {
        const response = await queenService.addNewQueen(name, franchise, season, location, status);
        if(!response) {
            logger.error('Queen.Controller.ts: addNewQueen() - service returned null', {name, franchise, season});
            return res.status(404).json({Error: "Unable to make queen matching params"});
        }
        logger.info('Queen.Controller.ts: addNewQueen() - queen created successfully', {name, franchise, season});
        return res.status(201).json(response);
    } catch(error) {
        logger.error('Queen.Controller.ts: addNewQueen() - unexpected error', {name, franchise, season, error});
        res.status(500).json({Error: "Unable to insert queen into table"});
    }
};

// Doc: Adds multiple queen records to the database in bulk.
// Doc: Args: req (Request) - Express request object with body containing array of {name: string, franchise: string, season: number, status: QueenStatus, location?: string}[], res (Response) - Express response object
// Doc: Route: Likely POST /queens/bulk
export const addNewQueens = async (req: Request, res: Response) => {
    const queensData = req.body as INTERFACES.QueenInput[];
    logger.debug('Queen.Controller.ts: addNewQueens() - bulk insert request received', {count: Array.isArray(queensData) ? queensData.length : 'invalid'});

    if(!Array.isArray(queensData) || queensData.length == 0) {
        logger.error('Queen.Controller.ts: addNewQueens() - invalid or empty input array');
        return res.status(404).json({Error: "Error with queensData input"});
    }

    try {
        let response = await queenService.addNewQueens(queensData);
        if(!response) {
            logger.error('Queen.Controller.ts: addNewQueens() - service returned null', {count: queensData.length});
            return res.status(404).json({Error: "Error adding list of Queens to Queen table"});
        }
        logger.info('Queen.Controller.ts: addNewQueens() - bulk insert complete', {inserted: response.count});
        res.status(201).json(response);
    } catch(error) {
        logger.error('Queen.Controller.ts: addNewQueens() - unexpected error', {count: queensData.length, error});
        res.status(500).json({Error: "Error inserting list of quenes"});
    }
};

// Doc: Updates a queen's status (e.g., ACTIVE, ELIMINATED, WINNER).
// Doc: Args: req (Request) - Express request object with body containing {name: string, franchise: string, season: number, status: QueenStatus}, res (Response) - Express response object
// Doc: Route: Likely PUT /queens/status or PATCH /queens/status
export const updateQueenStatus = async (req: Request, res: Response) => {
    const {name, franchise, season, status} = req.body;
    logger.info('Queen.Controller.ts: updateQueenStatus() - request received', {name, franchise, season, newStatus: status});
    try {
        let response = await queenService.updateQueenStatus(name, franchise, season, status);
        if(!response) {
            logger.error('Queen.Controller.ts: updateQueenStatus() - service returned null', {name, franchise, season, status});
            return res.status(404).json({Error: `Error updating queen ${name} status to ${status}`});
        }
        logger.info('Queen.Controller.ts: updateQueenStatus() - status updated successfully', {name, franchise, season, status, updatedCount: response.count});
        res.status(201).json(response);
    } catch(error) {
        logger.error('Queen.Controller.ts: updateQueenStatus() - unexpected error', {name, franchise, season, status, error});
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
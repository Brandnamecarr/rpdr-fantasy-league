import { Request, Response } from "express";
import * as seasonService from "../services/activeSeasons.service";
import logger from "../util/logger/LoggerImpl";

// Doc: Retrieves all seasons with active status from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /active-seasons or GET /seasons/active
export const getActiveSeasons = async (req: Request, res: Response) => {
    logger.info('ActiveSeasons.Controller: getActiveSeasons() - Request received to fetch all active seasons');

    try {
        let response = await seasonService.getActiveSeasons();

        if(!response || response.length === 0) {
            logger.info('ActiveSeasons.Controller: getActiveSeasons() - No active seasons found in database');
            return res.status(404).json({Error: 'Unable to find any active seasons'});
        }

        logger.info('ActiveSeasons.Controller: getActiveSeasons() - Successfully retrieved active seasons', {count: response.length});
        res.status(200).json(response);
    } catch(error) {
        logger.error('ActiveSeasons.Controller: getActiveSeasons() - Error retrieving active seasons', {error: error});
        res.status(500).json({Error: 'Server error when loading Active Seasons'});
    }
};

// Doc: Retrieves all upcoming (INACTIVE) seasons from the database.
// Doc: Args: req (Request), res (Response)
// Doc: Route: GET /activeSeason/getUpcomingSeasons
export const getUpcomingSeasons = async (req: Request, res: Response) => {
    logger.info('ActiveSeasons.Controller: getUpcomingSeasons() - Request received');
    try {
        const response = await seasonService.getUpcomingSeasons();
        if (!response || response.length === 0) {
            return res.status(200).json([]);
        }
        logger.info('ActiveSeasons.Controller: getUpcomingSeasons() - retrieved', {count: response.length});
        res.status(200).json(response);
    } catch (error) {
        logger.error('ActiveSeasons.Controller: getUpcomingSeasons() - error', {error});
        res.status(500).json({Error: 'Server error when loading upcoming seasons'});
    }
};

// Doc: Retrieves all seasons from the database regardless of status.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /seasons
export const getAllSeasons = async (req: Request, res: Response) => {
    logger.info('ActiveSeasons.Controller: getAllSeasons() - Request received to fetch all seasons');

    try {
        let response = await seasonService.getAllSeasons();

        if(!response || response.length === 0) {
            logger.info('ActiveSeasons.Controller: getAllSeasons() - No seasons found in database');
            return res.status(404).json({Error: 'Unable to find any seasons'});
        }

        logger.info('ActiveSeasons.Controller: getAllSeasons() - Successfully retrieved all seasons', {count: response.length});
        res.status(200).json(response);
    } catch(error) {
        logger.error('ActiveSeasons.Controller: getAllSeasons() - Error retrieving all seasons', {error: error});
        res.status(500).json({Error: 'Server error when locating all seasons'});
    }
};

const parseDateField = (value?: string): Date | undefined => {
    if (!value) return undefined;
    // Accepts MM-DD-YYYY
    const [month, day, year] = value.split('-').map(Number);
    if (!month || !day || !year) return undefined;
    return new Date(year, month - 1, day);
};

// Doc: Adds a new season record to the database.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /seasons
export const addSeason = async (req: Request, res: Response) => {
    const {franchise, season, isUsingBrackets, bracketCount, startDate, endDate} = req.body;
    logger.info('ActiveSeasons.Controller: addSeason() - Request received to add new season', {franchise, season, isUsingBrackets, bracketCount});

    let seasonAsInt = Number(season) || 0;

    if(seasonAsInt === 0 || !franchise || franchise === '') {
        logger.error('ActiveSeasons.Controller: addSeason() - Invalid parameters provided', {franchise, season, seasonAsInt});
        return res.status(400).json({Error: `Franchise and Season must be valid parameters`});
    }

    try {
        logger.debug('ActiveSeasons.Controller: addSeason() - Calling service to add season', {franchise, seasonAsInt});
        let response = await seasonService.addSeason(
            franchise,
            seasonAsInt,
            isUsingBrackets !== undefined ? Boolean(isUsingBrackets) : undefined,
            bracketCount !== undefined ? Number(bracketCount) : undefined,
            parseDateField(startDate),
            parseDateField(endDate),
        );

        if(!response) {
            logger.error('ActiveSeasons.Controller: addSeason() - Service returned null response', {franchise, seasonAsInt});
            return res.status(500).json({Error: 'Unable to add season to database'});
        }

        logger.info('ActiveSeasons.Controller: addSeason() - Successfully added new season', {franchise, season: seasonAsInt, seasonId: response.seasonId});
        res.status(201).json(response);
    } catch(error) {
        logger.error('ActiveSeasons.Controller: addSeason() - Error adding season to database', {franchise, season: seasonAsInt, error: error});
        res.status(500).json({Error: 'Error adding new season to table'});
    }
};

export const addBracket = async (req: Request, res: Response) => {
    const { franchise, season, bracketName, queens } = req.body;

    if (!franchise || !season || !bracketName || !queens || !Array.isArray(queens)) {
        logger.error('ActiveSeasons.Controller: addBracket() - Missing or invalid parameters', {franchise, season, bracketName});
        return res.status(400).json({ Error: 'franchise, season, bracketName (A|B|C), and queens (array) are required' });
    }

    if (!['A', 'B', 'C'].includes(bracketName)) {
        logger.error('ActiveSeasons.Controller: addBracket() - Invalid bracketName', {bracketName});
        return res.status(400).json({ Error: 'bracketName must be A, B, or C' });
    }

    const seasonAsInt = Number(season);
    if (!seasonAsInt) {
        return res.status(400).json({ Error: 'season must be a valid number' });
    }

    try {
        const response = await seasonService.addBracket(franchise, seasonAsInt, bracketName, queens);
        logger.info('ActiveSeasons.Controller: addBracket() - bracket created', {franchise, season: seasonAsInt, bracketName});
        return res.status(201).json(response);
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ Error: `Bracket ${bracketName} already exists for ${franchise} Season ${season}` });
        }
        logger.error('ActiveSeasons.Controller: addBracket() - error', {error});
        return res.status(500).json({ Error: 'Error adding bracket' });
    }
};

export const getBrackets = async (req: Request, res: Response) => {
    const franchise = req.query.franchise as string;
    const season = Number(req.query.season) || -1;

    if (!franchise || season === -1) {
        logger.error('ActiveSeasons.Controller: getBrackets() - Missing parameters');
        return res.status(400).json({ Error: 'franchise and season query params are required' });
    }

    try {
        const brackets = await seasonService.getBrackets(franchise, season);
        logger.info('ActiveSeasons.Controller: getBrackets() - returning brackets', {franchise, season, count: brackets.length});
        return res.status(200).json(brackets);
    } catch (error) {
        logger.error('ActiveSeasons.Controller: getBrackets() - error', {error});
        return res.status(500).json({ Error: 'Error fetching brackets' });
    }
};

// Doc: Updates the status of an existing season in the database.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number, status: string}, res (Response) - Express response object
// Doc: Route: Likely PUT /seasons or PATCH /seasons
export const updateSeason = async (req: Request, res: Response) => {
    const {franchise, season, status, startDate, endDate} = req.body;
    logger.info('ActiveSeasons.Controller: updateSeason() - Request received to update season status', {franchise, season, newStatus: status});

    let seasonAsInt = Number(season) || 0;

    if(seasonAsInt === 0 || !franchise || franchise === '' || !status || status === '') {
        logger.error('ActiveSeasons.Controller: updateSeason() - Invalid parameters provided', {franchise, season, status});
        return res.status(400).json({Error: 'Invalid parameters in function call'});
    }

    try {
        logger.debug('ActiveSeasons.Controller: updateSeason() - Calling service to update season status', {franchise, season: seasonAsInt, status});
        let response = await seasonService.updateSeason(
            franchise, season, status,
            parseDateField(startDate),
            parseDateField(endDate),
        );

        if(!response) {
            logger.error('ActiveSeasons.Controller: updateSeason() - Service returned null, season not found or update failed', {franchise, season});
            return res.status(404).json({Error: `Unable to update season status`});
        }

        logger.info('ActiveSeasons.Controller: updateSeason() - Successfully updated season status', {franchise, season, newStatus: response.activityStatus});
        res.status(200).json(response);
    } catch(error) {
        logger.error('ActiveSeasons.Controller: updateSeason() - Error updating season status', {franchise, season, status, error: error});
        res.status(500).json({Error: 'Something went wrong when updating status'});
    }
};

export const getFinaleEligibleSeasons = async (req: Request, res: Response) => {
    logger.info('ActiveSeasons.Controller: getFinaleEligibleSeasons() - Request received');
    try {
        const response = await seasonService.getFinaleEligibleSeasons();
        res.status(200).json(response);
    } catch (error) {
        logger.error('ActiveSeasons.Controller: getFinaleEligibleSeasons() - error', {error});
        res.status(500).json({Error: 'Server error when loading finale-eligible seasons'});
    }
};

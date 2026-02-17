import { Request, Response } from "express";
import * as seasonService from "../services/activeSeasons.service";
import logger from "../util/LoggerImpl";

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

// Doc: Adds a new season record to the database.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /seasons
export const addSeason = async (req: Request, res: Response) => {
    const {franchise, season} = req.body;
    logger.info('ActiveSeasons.Controller: addSeason() - Request received to add new season', {franchise, season});

    let seasonAsInt = Number(season) || 0;

    if(seasonAsInt === 0 || !franchise || franchise === '') {
        logger.error('ActiveSeasons.Controller: addSeason() - Invalid parameters provided', {franchise, season, seasonAsInt});
        return res.status(400).json({Error: `Franchise and Season must be valid parameters`});
    }

    try {
        logger.debug('ActiveSeasons.Controller: addSeason() - Calling service to add season', {franchise, seasonAsInt});
        let response = await seasonService.addSeason(franchise, seasonAsInt);

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

// Doc: Updates the status of an existing season in the database.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number, status: string}, res (Response) - Express response object
// Doc: Route: Likely PUT /seasons or PATCH /seasons
export const updateSeason = async (req: Request, res: Response) => {
    const {franchise, season, status} = req.body;
    logger.info('ActiveSeasons.Controller: updateSeason() - Request received to update season status', {franchise, season, newStatus: status});

    let seasonAsInt = Number(season) || 0;

    if(seasonAsInt === 0 || !franchise || franchise === '' || !status || status === '') {
        logger.error('ActiveSeasons.Controller: updateSeason() - Invalid parameters provided', {franchise, season, status});
        return res.status(400).json({Error: 'Invalid parameters in function call'});
    }

    try {
        logger.debug('ActiveSeasons.Controller: updateSeason() - Calling service to update season status', {franchise, season: seasonAsInt, status});
        let response = await seasonService.updateSeason(franchise, season, status);

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

import { Request, Response } from "express";
import * as seasonService from "../services/activeSeasons.service";
import logger from "../util/LoggerImpl";

// gets all active season //
export const getActiveSeasons = async (req: Request, res: Response) => {
    try {
        let response = await seasonService.getActiveSeasons();
        if(!response) {
            return res.status(404).json({Error: 'Unable to find any active seasons'});
        }
        res.status(201).json(response);
    } catch(error) {
        res.status(500).json({Error: 'Server error when loading Active Seasons'});
    }
};

// gets all table contents //
export const getAllSeasons = async (req: Request, res: Response) => {
    try {
        let response = await seasonService.getAllSeasons();
        if(!response) {
            return res.status(404).json({Error: 'Unable to find any seasons'});
        }
        res.status(201).json(response);
    } catch(error) {
        res.status(500).json({Error: 'Server error when locating all seasons'});
    }
};

// adds a record to the table //
export const addSeason = async (req: Request, res: Response) => {
    const {franchise, season} = req.body;
    let seasonAsInt = Number(season) || 0;

    if(seasonAsInt === 0 || !franchise || franchise === '') {
        return res.status(404).json({Error: `Franchise and Season must be valid parameter`});
    }

    try {
        let response = await seasonService.addSeason(franchise, seasonAsInt);
        if(!response) {
            return res.status(404).json({Error: 'Unable to add season to database'});
        }
        res.status(201).json(response);
    } catch(error) {
        res.status(500).json({Error: 'Error adding new season to table'});
    }
};

// updates a status from the table //
export const updateSeason = async (req: Request, res: Response) => {
    const {franchise, season, status} = req.body;
    let seasonAsInt = Number(season) || 0;

    if(seasonAsInt === 0 || !franchise || franchise === '' || !status || status === '') {
        return res.status(404).json({Error: 'Invalid parameters in function call'});
    }
    try {
        let response = await seasonService.updateSeason(franchise, season, status);
        if(!response) {
            return res.status(404).json({Error: `Unable to update season status`});
        }
        res.status(201).json(response);
    } catch(error) {
        res.status(500).json({Error: 'Something went wrong when updating status'});
    }
};

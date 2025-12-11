import { Request, Response } from "express";
import * as notifService from '../services/notification.service';
import logger from "../util/LoggerImpl";

export const getUserNotifs = async (req: Request, res: Response) => {
    const {email} = req.body;
    logger.info('Notification.Controller.ts: getting allUserNotifs for: ', {email: email});
    try {
        let response = notifService.getAllByUser(email);
        logger.info('Notification.Controller.ts: returning status=201');
        res.status(201).json(response);
    } catch(error) {
        logger.error('Notification.Controller.ts: error with notifications: ', {error: error});
        res.status(500).json({error: error});
    }
};

export const getAllActiveNotifs = async (req: Request, res: Response) => {
    const {email} = req.body;

    try {
        let response = notifService.getAllActiveNotifs(email);
        logger.info('notification.controller.ts: got list of active notifs: ', {notifs: response});
        res.status(201).json(response);
    } catch(error) {
        logger.error('notification.controller.ts: error retrieving notifications: ', {error: error});
        res.status(500).json({error: error});
    }
};
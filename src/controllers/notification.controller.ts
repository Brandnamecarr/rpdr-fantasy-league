import { Request, Response } from "express";
import * as notifService from '../services/notification.service';
import logger from "../util/LoggerImpl";

export const getUserNotifs = async (req: Request, res: Response) => {
    const {email} = req.body;
    logger.debug('Notification.Controller.ts: getting allUserNotifs for: ', {email: email});
    try {
        let response = await notifService.getAllByUser(email);
        logger.debug('Notification.Controller.ts: returning status=201, payload: ', {response: response});
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
        logger.debug('notification.controller.ts: got list of active notifs: ', {notifs: response});
        res.status(201).json(response);
    } catch(error) {
        logger.error('notification.controller.ts: error retrieving notifications: ', {error: error});
        res.status(500).json({error: error});
    }
};

export const makeNewNotification = async (req: Request, res: Response) => {
    const {source, destination, content} = req.body;
    logger.debug('Notification.Controller.ts: makeNewNotification got payload: ', {data: req.body});
    try {
        let response = await notifService.makeNewNotification(source, destination, content);
        logger.debug(`Notification.Controller.ts: Got response: ${response}`);
        if(!response) {
            res.status(500).json({'Error': 'Internal server error creating new notification'});
        } else {
            res.status(201).json(response);
        }
    } catch(error) {
        logger.error('Notification.Controller.ts: makeNewNotification Error: ', {error: error});
        res.status(500).json({error: error});
    }
};

export const updateNotifStatus = async (req: Request, res: Response) => {
    const {notifId} = req.body;
    try {
        let response = await notifService.updateNotifStatus(notifId);
        if(!response) {
            logger.debug('Notification.Controller.ts: Got bad response from notifService: ', {response: response});
            return res.status(500).json({Error: 'Error updating notification', notifId: `${notifId}`});
        }
        logger.debug('Notification.Controller.ts: updateNotifStatus got back: ', {response: response});
        res.status(201).json({source: 'updateNotifStatus', response: response});
    } catch(error) {
        logger.error('Notification.Controller.ts: Error with updateNotifStatus: ', {error: error});
        res.status(500).json({error: error});
    }
};
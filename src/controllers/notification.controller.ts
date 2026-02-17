import { Request, Response } from "express";
import * as notifService from '../services/notification.service';
import logger from "../util/LoggerImpl";

// Doc: Retrieves all notifications for a specific user.
// Doc: Args: req (Request) - Express request object with body containing {email: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications/user or GET /notifications/user
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

// Doc: Retrieves all active (unread) notifications for a specific user.
// Doc: Args: req (Request) - Express request object with body containing {email: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications/active or GET /notifications/active
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

// Doc: Creates a new notification with source, destination, and content.
// Doc: Args: req (Request) - Express request object with body containing {source: string, destination: string, content: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications
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

// Doc: Updates a notification's status (e.g., marks as read).
// Doc: Args: req (Request) - Express request object with body containing {notifId: string}, res (Response) - Express response object
// Doc: Route: Likely PUT /notifications or PATCH /notifications
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
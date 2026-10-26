import { Response } from "express";
import * as notifService from '../services/notification.service';
import logger from "../util/logger/LoggerImpl";
import { AuthRequest } from "../types/CustomRequests";
import { GetNotifsForEmailBody, MakeNewNotificationBody, UpdateNotifStatusBody } from "../types/Interfaces";
import { isAdminEmail } from "../util/credentials/TokenManager";

// Doc: Retrieves all notifications for a specific user.
// Doc: Args: req (AuthRequest<GetNotifsForEmailBody>) - Express request object with body containing {email: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications/user or GET /notifications/user
export const getUserNotifs = async (req: AuthRequest<GetNotifsForEmailBody>, res: Response) => {
    const requesterEmail = req.user?.email;
    logger.debug('Notification.Controller.ts: getting allUserNotifs for: ', {requesterEmail});
    try {
        // Doc: Non-admins may only look up their own notifications — the JWT-derived requesterEmail
        // Doc: is used for the lookup, not the body's email, to prevent IDOR.
        const response = isAdminEmail(requesterEmail)
            ? await notifService.getAllNotifications()
            : await notifService.getAllByUser(requesterEmail ?? '');
        logger.debug('Notification.Controller.ts: returning user notifications', {count: response?.length});
        res.status(200).json(response);
    } catch(error) {
        logger.error('Notification.Controller.ts: error with notifications: ', {error});
        res.status(500).json({Error: 'Error fetching notifications'});
    }
};

// Doc: Retrieves all active (unread) notifications for a specific user.
// Doc: Args: req (AuthRequest<GetNotifsForEmailBody>) - Express request object with body containing {email: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications/active or GET /notifications/active
export const getAllActiveNotifs = async (req: AuthRequest<GetNotifsForEmailBody>, res: Response) => {
    const requesterEmail = req.user?.email;
    logger.debug('Notification.Controller.ts: getAllActiveNotifs() - request received', {requesterEmail});

    try {
        // Doc: Non-admins may only look up their own active notifications — the JWT-derived
        // Doc: requesterEmail is used for the lookup, not the body's email, to prevent IDOR.
        const response = isAdminEmail(requesterEmail)
            ? await notifService.getAllActiveNotifications()
            : await notifService.getAllActiveNotifs(requesterEmail ?? '');
        logger.debug('Notification.Controller.ts: getAllActiveNotifs() - returning active notifications', {requesterEmail, count: response?.length});
        res.status(200).json(response);
    } catch(error) {
        logger.error('Notification.Controller.ts: getAllActiveNotifs() - unexpected error', {requesterEmail, error});
        res.status(500).json({Error: 'Error fetching active notifications'});
    }
};

// Doc: Creates a new notification with source, destination, and content. Admin-only — there are
// Doc: currently no non-admin call sites of this route (join-request flows go through
// Doc: notificationService.makeNewNotification directly from leagueOps.service.ts, not this endpoint).
// Doc: Args: req (AuthRequest<MakeNewNotificationBody>) - Express request object with body containing {source: string, destination: string, content: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications
export const makeNewNotification = async (req: AuthRequest<MakeNewNotificationBody>, res: Response) => {
    if (!isAdminEmail(req.user?.email)) {
        logger.error('Notification.Controller.ts: makeNewNotification() - non-admin attempted to create a notification', {requesterEmail: req.user?.email});
        return res.status(403).json({Error: 'Admin access required'});
    }
    const {source, destination, content, type, joinRequestId} = req.body;
    logger.debug('Notification.Controller.ts: makeNewNotification got payload: ', {data: req.body});
    try {
        let response = await notifService.makeNewNotification(source, destination, content, type, joinRequestId ?? null);
        logger.debug(`Notification.Controller.ts: Got response: ${response}`);
        if(!response) {
            res.status(500).json({'Error': 'Internal server error creating new notification'});
        } else {
            res.status(201).json(response);
        }
    } catch(error) {
        logger.error('Notification.Controller.ts: makeNewNotification Error: ', {error});
        res.status(500).json({Error: 'Error creating notification'});
    }
};

// Doc: Updates a notification's status (e.g., marks as read). Requires the caller to own the
// Doc: notification (destination === requester email) or be an admin — prevents one user from
// Doc: resolving another user's notifications by guessing/enumerating notifId.
// Doc: Args: req (AuthRequest) - Express request object with body containing {notifId: string}, res (Response) - Express response object
// Doc: Route: Likely PUT /notifications or PATCH /notifications
export const updateNotifStatus = async (req: AuthRequest<UpdateNotifStatusBody>, res: Response) => {
    const {notifId} = req.body;
    const requesterEmail = req.user?.email;
    try {
        const notif = await notifService.getById(notifId);
        if (!notif) {
            return res.status(404).json({Error: 'Notification not found', notifId: `${notifId}`});
        }
        if (notif.destination !== requesterEmail && !isAdminEmail(requesterEmail)) {
            logger.error('Notification.Controller.ts: updateNotifStatus() - requester does not own this notification', {notifId, requesterEmail});
            return res.status(403).json({Error: 'Forbidden'});
        }
        let response = await notifService.updateNotifStatus(notifId);
        if(!response) {
            logger.debug('Notification.Controller.ts: Got bad response from notifService: ', {response: response});
            return res.status(500).json({Error: 'Error updating notification', notifId: `${notifId}`});
        }
        logger.debug('Notification.Controller.ts: updateNotifStatus got back: ', {response: response});
        res.status(200).json({source: 'updateNotifStatus', response: response});
    } catch(error) {
        logger.error('Notification.Controller.ts: Error with updateNotifStatus: ', {error});
        res.status(500).json({Error: 'Error updating notification status'});
    }
};
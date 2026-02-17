import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// Doc: Queries the database for all notifications sent to a specific user's email.
// Doc: Args: email (string) - The destination email address
// Doc: Returns: Promise<Notification[]> - Array of notification records
export const getAllByUser = async (email: string) => {
    let notifs = await prisma.notification.findMany({
        where: {
            destination: email,
        },
    });
    logger.debug('Notification.Service.ts: Got these notifs from DB: ', {notifs: notifs});
    return notifs;
};

// Doc: Queries the database for all unresolved notifications for a specific user.
// Doc: Args: email (string) - The destination email address
// Doc: Returns: Promise<Notification[]> - Array of active (unresolved) notification records
export const getAllActiveNotifs = async (email: string) => {
    return await prisma.notification.findMany({
        where: {
            destination: email,
            resolved: false,
        },
    });
};

// Doc: Creates a new notification record in the database.
// Doc: Args: source (string) - The sender/source of the notification, dest (string) - The destination email address, content (string) - The notification message content
// Doc: Returns: Promise<Notification | null> - The created notification record or null on error
export const makeNewNotification = async (source: string, dest: string, content: string) => {
    logger.debug('Notification.Service.ts: makeNewNotification with: ', {source: source, dest: dest, content: content});
    try {
        const newNotif = await prisma.notification.create({
        data: {
            source: source,
            destination: dest,
            content: content,
        },
    });
        logger.debug('Notification.Service.ts: New Notification Created: ', newNotif);
        return newNotif;
    } catch(error) {
        logger.error('Notification.Service.ts: makeNewNotification Error: ', {error: error});
        return null;
    }
};

// Doc: Updates a notification's status to resolved (marks as read).
// Doc: Args: notifId (number) - The notification ID to update
// Doc: Returns: Promise<Notification | undefined> - The updated notification record or undefined on error
export const updateNotifStatus = async (notifId: number) => {
    logger.debug('Notification.Service.ts: updateNotifStatus with notifId: ', {notifId: notifId});
    try {
        let updatedPayload = {
            resolved: true,
        };
        let response = await prisma.notification.update({
                where: {
                    notifId: notifId,
                },
                data: updatedPayload,
            });
            logger.debug('Notification.Service.ts: returning response: ', {response: response.notifId});
        return response;
    } catch(error) {
        logger.error('Notification.Service.ts: Error in updateNotifStatus: ', {error: error});
    }
};
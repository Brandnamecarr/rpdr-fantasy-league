import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// gets all notifs sent to the email //
export const getAllByUser = async (email: string) => {
    let notifs = await prisma.notification.findMany({
        where: {
            destination: email,
        },
    });
    logger.info('Notification.Service.ts: Got these notifs from DB: ', {notifs: notifs});
    console.log(notifs);
    return notifs;
};

// gets all Active notifications associated with the email //
export const getAllActiveNotifs = async (email: string) => {
    return await prisma.notification.findMany({
        where: {
            destination: email,
            resolved: false,
        },
    });
};

export const makeNewNotification = async (source: string, dest: string, content: string) => {
    logger.info('Notification.Service.ts: makeNewNotification with: ', {source: source, dest: dest, content: content});
    try {
        const newNotif = await prisma.notification.create({
        data: {
            source: source,
            destination: dest,
            content: content,
        },
    });
        logger.info('Notification.Service.ts: New Notification Created: ', newNotif);
        return newNotif;
    } catch(error) {
        logger.error('Notification.Service.ts: makeNewNotification Error: ', {error: error});
        return null;
    }
};

export const updateNotifStatus = async (notifId: number) => {
    logger.info('Notification.Service.ts: updateNotifStatus with notifId: ', {notifId: notifId});
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
            logger.info('Notification.Service.ts: returning response: ', {response: response.notifId});
        return response;
    } catch(error) {
        logger.error('Notification.Service.ts: Error in updateNotifStatus: ', {error: error});
    }
};
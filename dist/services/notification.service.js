"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotifStatus = exports.makeNewNotification = exports.getAllActiveNotifs = exports.getAllByUser = void 0;
const prisma_client_1 = __importDefault(require("../db/prisma.client"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Queries the database for all notifications sent to a specific user's email.
// Doc: Args: email (string) - The destination email address
// Doc: Returns: Promise<Notification[]> - Array of notification records
const getAllByUser = async (email) => {
    let notifs = await prisma_client_1.default.notification.findMany({
        where: {
            destination: email,
        },
    });
    LoggerImpl_1.default.debug('Notification.Service.ts: Got these notifs from DB: ', { notifs: notifs });
    return notifs;
};
exports.getAllByUser = getAllByUser;
// Doc: Queries the database for all unresolved notifications for a specific user.
// Doc: Args: email (string) - The destination email address
// Doc: Returns: Promise<Notification[]> - Array of active (unresolved) notification records
const getAllActiveNotifs = async (email) => {
    return await prisma_client_1.default.notification.findMany({
        where: {
            destination: email,
            resolved: false,
        },
    });
};
exports.getAllActiveNotifs = getAllActiveNotifs;
// Doc: Creates a new notification record in the database.
// Doc: Args: source (string) - The sender/source of the notification, dest (string) - The destination email address, content (string) - The notification message content
// Doc: Returns: Promise<Notification | null> - The created notification record or null on error
const makeNewNotification = async (source, dest, content) => {
    LoggerImpl_1.default.debug('Notification.Service.ts: makeNewNotification with: ', { source: source, dest: dest, content: content });
    try {
        const newNotif = await prisma_client_1.default.notification.create({
            data: {
                source: source,
                destination: dest,
                content: content,
            },
        });
        LoggerImpl_1.default.debug('Notification.Service.ts: New Notification Created: ', newNotif);
        return newNotif;
    }
    catch (error) {
        LoggerImpl_1.default.error('Notification.Service.ts: makeNewNotification Error: ', { error: error });
        return null;
    }
};
exports.makeNewNotification = makeNewNotification;
// Doc: Updates a notification's status to resolved (marks as read).
// Doc: Args: notifId (number) - The notification ID to update
// Doc: Returns: Promise<Notification | undefined> - The updated notification record or undefined on error
const updateNotifStatus = async (notifId) => {
    LoggerImpl_1.default.debug('Notification.Service.ts: updateNotifStatus with notifId: ', { notifId: notifId });
    try {
        let updatedPayload = {
            resolved: true,
        };
        let response = await prisma_client_1.default.notification.update({
            where: {
                notifId: notifId,
            },
            data: updatedPayload,
        });
        LoggerImpl_1.default.debug('Notification.Service.ts: returning response: ', { response: response.notifId });
        return response;
    }
    catch (error) {
        LoggerImpl_1.default.error('Notification.Service.ts: Error in updateNotifStatus: ', { error: error });
    }
};
exports.updateNotifStatus = updateNotifStatus;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotifStatus = exports.makeNewNotification = exports.getAllActiveNotifs = exports.getUserNotifs = void 0;
const notifService = __importStar(require("../services/notification.service"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Retrieves all notifications for a specific user.
// Doc: Args: req (Request) - Express request object with body containing {email: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications/user or GET /notifications/user
const getUserNotifs = async (req, res) => {
    const { email } = req.body;
    LoggerImpl_1.default.debug('Notification.Controller.ts: getting allUserNotifs for: ', { email: email });
    try {
        let response = await notifService.getAllByUser(email);
        LoggerImpl_1.default.debug('Notification.Controller.ts: returning status=201, payload: ', { response: response });
        res.status(201).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('Notification.Controller.ts: error with notifications: ', { error: error });
        res.status(500).json({ error: error });
    }
};
exports.getUserNotifs = getUserNotifs;
// Doc: Retrieves all active (unread) notifications for a specific user.
// Doc: Args: req (Request) - Express request object with body containing {email: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications/active or GET /notifications/active
const getAllActiveNotifs = async (req, res) => {
    const { email } = req.body;
    LoggerImpl_1.default.debug('Notification.Controller.ts: getAllActiveNotifs() - request received', { email });
    try {
        let response = await notifService.getAllActiveNotifs(email);
        LoggerImpl_1.default.debug('Notification.Controller.ts: getAllActiveNotifs() - returning active notifications', { email, count: response?.length });
        res.status(201).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('Notification.Controller.ts: getAllActiveNotifs() - unexpected error', { email, error });
        res.status(500).json({ error: error });
    }
};
exports.getAllActiveNotifs = getAllActiveNotifs;
// Doc: Creates a new notification with source, destination, and content.
// Doc: Args: req (Request) - Express request object with body containing {source: string, destination: string, content: string}, res (Response) - Express response object
// Doc: Route: Likely POST /notifications
const makeNewNotification = async (req, res) => {
    const { source, destination, content } = req.body;
    LoggerImpl_1.default.debug('Notification.Controller.ts: makeNewNotification got payload: ', { data: req.body });
    try {
        let response = await notifService.makeNewNotification(source, destination, content);
        LoggerImpl_1.default.debug(`Notification.Controller.ts: Got response: ${response}`);
        if (!response) {
            res.status(500).json({ 'Error': 'Internal server error creating new notification' });
        }
        else {
            res.status(201).json(response);
        }
    }
    catch (error) {
        LoggerImpl_1.default.error('Notification.Controller.ts: makeNewNotification Error: ', { error: error });
        res.status(500).json({ error: error });
    }
};
exports.makeNewNotification = makeNewNotification;
// Doc: Updates a notification's status (e.g., marks as read).
// Doc: Args: req (Request) - Express request object with body containing {notifId: string}, res (Response) - Express response object
// Doc: Route: Likely PUT /notifications or PATCH /notifications
const updateNotifStatus = async (req, res) => {
    const { notifId } = req.body;
    try {
        let response = await notifService.updateNotifStatus(notifId);
        if (!response) {
            LoggerImpl_1.default.debug('Notification.Controller.ts: Got bad response from notifService: ', { response: response });
            return res.status(500).json({ Error: 'Error updating notification', notifId: `${notifId}` });
        }
        LoggerImpl_1.default.debug('Notification.Controller.ts: updateNotifStatus got back: ', { response: response });
        res.status(201).json({ source: 'updateNotifStatus', response: response });
    }
    catch (error) {
        LoggerImpl_1.default.error('Notification.Controller.ts: Error with updateNotifStatus: ', { error: error });
        res.status(500).json({ error: error });
    }
};
exports.updateNotifStatus = updateNotifStatus;

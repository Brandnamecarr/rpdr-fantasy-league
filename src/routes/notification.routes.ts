// Doc: Route definitions for notification endpoints. All routes are protected by JWT authentication.
// Doc: Base path: /notifications (or similar, depending on app.ts configuration)
import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as notifController from '../controllers/notification.controller';

const router = Router();
// Doc: Middleware to protect all routes in this router with JWT authentication
router.use(protect);

// Doc: POST /notifications/get - Retrieves all notifications for a user (body: {email})
router.post('/get', notifController.getUserNotifs);
// Doc: POST /notifications/getAllActive - Retrieves all active (unread) notifications for a user (body: {email})
router.post('/getAllActive', notifController.getAllActiveNotifs);
// Doc: POST /notifications/newNotification - Creates a new notification (body: {source, destination, content})
router.post('/newNotification', notifController.makeNewNotification);
// Doc: POST /notifications/updateNotification - Marks a notification as read (body: {notifId})
router.post('/updateNotification', notifController.updateNotifStatus);

export default router;
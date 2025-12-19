import { Router } from "express";
import * as notifController from '../controllers/notification.controller';

const router = Router();

router.post('/get', notifController.getUserNotifs);
router.post('/getAllActive', notifController.getAllActiveNotifs);
router.post('/newNotification', notifController.makeNewNotification);
router.post('/updateNotification', notifController.updateNotifStatus);

export default router;
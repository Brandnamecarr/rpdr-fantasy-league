import { Router } from "express";
import * as notifController from '../controllers/notification.controller';

const router = Router();

router.get('/get', notifController.getUserNotifs);
router.get('/getAllActive', notifController.getAllActiveNotifs);

export default router;
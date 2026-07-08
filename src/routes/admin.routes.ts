import { Router } from 'express';
import { protectAdmin } from '../util/TokenManager';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Database operations
router.get('/dump',                protectAdmin, adminController.dumpDatabase);
router.post('/dump',               protectAdmin, adminController.restoreDatabase);

// Season finale
router.post('/computeSeasonFinale', protectAdmin, adminController.computeSeasonFinale);

// Weekly update (admin-keyed)
router.post('/weeklyUpdate',       protectAdmin, adminController.adminWeeklyUpdate);

// User management
router.get('/users',               protectAdmin, adminController.getAllUsers);
router.post('/resetPassword',      protectAdmin, adminController.resetUserPassword);

// Data lookups for admin forms
router.get('/activeSeasons',       protectAdmin, adminController.getAdminActiveSeasons);
router.get('/queens',              protectAdmin, adminController.getAdminQueens);
router.get('/brackets',            protectAdmin, adminController.getAdminBrackets);

export default router;

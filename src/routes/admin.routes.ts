import { Router } from 'express';
import { protectAdmin } from '../util/credentials/TokenManager';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Database operations
router.get('/dump',                protectAdmin, adminController.dumpDatabase);
router.post('/dump',               protectAdmin, adminController.restoreDatabase);

// Season finale
router.post('/computeSeasonFinale', protectAdmin, adminController.computeSeasonFinale);
router.post('/endOfSeasonUpdate',   protectAdmin, adminController.endOfSeasonUpdate);

// Weekly update (admin-keyed)
router.post('/weeklyUpdate',       protectAdmin, adminController.adminWeeklyUpdate);

// User management
router.get('/users',               protectAdmin, adminController.getAllUsers);
router.post('/resetPassword',      protectAdmin, adminController.resetUserPassword);

// League management
router.post('/deleteLeague',       protectAdmin, adminController.deleteLeague);

// Mints a short-lived user JWT (seeded admin account) for calling JWT-protected routes from the admin panel
router.get('/getJwt',              protectAdmin, adminController.getAdminJwt);

// Data lookups for admin forms
router.get('/activeSeasons',       protectAdmin, adminController.getAdminActiveSeasons);
router.get('/queens',              protectAdmin, adminController.getAdminQueens);
router.get('/brackets',            protectAdmin, adminController.getAdminBrackets);

// Log viewer
router.get('/logs',                protectAdmin, adminController.getLogs);

// Workflows
router.post('/workflows/execute',            protectAdmin, adminController.executeWorkflow);
router.get('/workflows/status/:executionId', protectAdmin, adminController.getWorkflowStatus);

export default router;

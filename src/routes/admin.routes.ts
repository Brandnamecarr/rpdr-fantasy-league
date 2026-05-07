import { Router } from 'express';
import { protectAdmin } from '../util/TokenManager';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.get('/dump', protectAdmin, adminController.dumpDatabase);
router.post('/dump', protectAdmin, adminController.restoreDatabase);
router.post('/computeSeasonFinale', protectAdmin, adminController.computeSeasonFinale);

export default router;

import { Router } from 'express';
import { protectAdmin } from '../util/TokenManager';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.get('/dump', protectAdmin, adminController.dumpDatabase);

export default router;

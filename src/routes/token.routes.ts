import { Router } from "express";
import * as tokenController from '../controllers/tokens.controller';

const router = Router();

router.get('/getToken', tokenController.getToken);

export default router;
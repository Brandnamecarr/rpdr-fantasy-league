import { Router } from "express";
import * as leagueOpsController from '../controllers/leagueOps.controller';

const router = Router();

router.post("/weeklyUpdate", leagueOpsController.weeklyUpdate);

export default router;
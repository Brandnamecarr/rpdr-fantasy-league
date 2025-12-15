import { Router } from "express";
import * as leagueOpsController from '../controllers/leagueOps.controller';

const router = Router();

router.post('/addUserToLeague', leagueOpsController.addUserToLeague);
router.post("/weeklyUpdate", leagueOpsController.weeklyUpdate);
router.post("/weeklySurvey", leagueOpsController.weeklySurvey);
router.post("/getAllLeagueRosters", leagueOpsController.getAllRostersByLeague);
router.post("/addRoster", leagueOpsController.addRoster);

export default router;
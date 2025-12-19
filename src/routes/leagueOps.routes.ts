import { Router } from "express";
import * as leagueOpsController from '../controllers/leagueOps.controller';

const router = Router();

router.post('/addUserToLeague', leagueOpsController.addUserToLeague);
router.post('/removeUserFromLeague', leagueOpsController.removeUserFromLeague);
router.post("/weeklyUpdate", leagueOpsController.weeklyUpdate);
router.post("/weeklySurvey", leagueOpsController.weeklySurvey);
router.post("/getAllLeagueRosters", leagueOpsController.getAllRostersByLeague);
router.get("/getAllRosters", leagueOpsController.getAllRosters);
router.post("/addRoster", leagueOpsController.addRoster);

export default router;
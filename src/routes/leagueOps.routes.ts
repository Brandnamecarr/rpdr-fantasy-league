import { Router } from "express";
import * as leagueOpsController from '../controllers/leagueOps.controller';

const router = Router();

router.get("/getAllRosters", leagueOpsController.getAllRosters);
router.get("/getRostersByFranchiseAndSeason", leagueOpsController.getRostersByFranchiseAndSeason);

router.post("/weeklyUpdate", leagueOpsController.weeklyUpdate);
router.post("/weeklySurvey", leagueOpsController.weeklySurvey);
router.post('/addUserToLeague', leagueOpsController.addUserToLeague);
router.post('/removeUserFromLeague', leagueOpsController.removeUserFromLeague);
router.post("/getAllLeagueRosters", leagueOpsController.getAllRostersByLeague);
router.post("/addRoster", leagueOpsController.addRoster);

export default router;
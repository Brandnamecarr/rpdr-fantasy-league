import { Router } from "express";
import * as leagueController from "../controllers/league.controller";

const router = Router();

router.post("/getLeague", leagueController.getLeague);
router.get("/getAllLeagues", leagueController.getAllLeagues);
router.get("/getAvailableLeagues", leagueController.getAvailableLeagues);
router.post("/createLeague", leagueController.createLeague);
router.get("/allUserLeagues", leagueController.getLeaguesByUser);

export default router;
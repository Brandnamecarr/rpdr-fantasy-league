import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as leagueController from "../controllers/league.controller";

const router = Router();

router.use(protect);

router.get("/getAllLeagues", leagueController.getAllLeagues);
router.get("/allUserLeagues", leagueController.getLeaguesByUser);
router.get("/getAvailableLeagues", leagueController.getAvailableLeagues);
router.get("/getAvailableByFranAndSeason", leagueController.getAvailByFranAndSeason);

router.post("/getLeague", leagueController.getLeague);
router.post("/createLeague", leagueController.createLeague);


export default router;
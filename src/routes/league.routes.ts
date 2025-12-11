import { Router } from "express";
import * as leagueController from "../controllers/league.controller";

const router = Router();

router.get("/getLeague", leagueController.getLeague);
router.get("/getAllLeagues", leagueController.getAllLeagues);
router.get("/getAvailableLeagues", leagueController.getAvailableLeagues);
router.post("/createLeague", leagueController.createLeague);

export default router;
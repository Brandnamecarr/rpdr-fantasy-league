import { Router } from "express";
import * as leagueController from "../controllers/league.controller";

const router = Router();

router.get("/getLeague", leagueController.getLeague);
router.post("/getAllLeagues", leagueController.getAllLeagues);
router.post("/createLeague", leagueController.createLeague);
router.post("/addUser", leagueController.addUserToLeague);
router.post("/removeUser", leagueController.removeUserFromLeague);

export default router;
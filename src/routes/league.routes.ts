// Doc: Route definitions for league management endpoints. All routes are protected by JWT authentication.
// Doc: Base path: /league (or similar, depending on app.ts configuration)
import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as leagueController from "../controllers/league.controller";

const router = Router();

// Doc: Middleware to protect all routes in this router with JWT authentication
router.use(protect);

// Doc: GET /league/getAllLeagues - Retrieves all leagues in the database
router.get("/getAllLeagues", leagueController.getAllLeagues);
// Doc: GET /league/allUserLeagues?email=user@example.com - Retrieves all leagues for a specific user
router.get("/allUserLeagues", leagueController.getLeaguesByUser);
// Doc: GET /league/inactiveUserLeagues?email=user@example.com - Retrieves leagues the user is in that belong to INACTIVE seasons
router.get("/inactiveUserLeagues", leagueController.getInactiveLeaguesByUser);
// Doc: GET /league/getAvailableLeagues - Retrieves leagues with available spots
router.get("/getAvailableLeagues", leagueController.getAvailableLeagues);
// Doc: GET /league/getAvailableByFranAndSeason?franchise=US&season=16 - Retrieves available leagues by franchise and season
router.get("/getAvailableByFranAndSeason", leagueController.getAvailByFranAndSeason);

// Doc: POST /league/getLeague - Retrieves a specific league (body: {leagueName, franchise, season})
router.post("/getLeague", leagueController.getLeague);
// Doc: POST /league/createLeague - Creates a new league (body: {leagueName, owner, users, maxPlayers, maxQueensPerTeam, teamName, franchise, season, queens})
router.post("/createLeague", leagueController.createLeague);


export default router;
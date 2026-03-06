// Doc: Route definitions for league operations endpoints (roster management, weekly updates). All routes are protected by JWT authentication.
// Doc: Base path: /leagueOps (or similar, depending on app.ts configuration)
import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as leagueOpsController from '../controllers/leagueOps.controller';

const router = Router();
// Doc: Middleware to protect all routes in this router with JWT authentication
router.use(protect);

// Doc: GET /leagueOps/getAllRosters - Retrieves all rosters in the database
router.get("/getAllRosters", leagueOpsController.getAllRosters);
// Doc: GET /leagueOps/getRostersByFranchiseAndSeason?franchise=US&season=16 - Retrieves rosters by franchise and season
router.get("/getRostersByFranchiseAndSeason", leagueOpsController.getRostersByFranchiseAndSeason);

// Doc: POST /leagueOps/weeklyUpdate - Processes weekly episode results and updates points (body: {franchise, season, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated})
router.post("/weeklyUpdate", leagueOpsController.weeklyUpdate);
// Doc: POST /leagueOps/weeklySurvey - Processes weekly survey results (body: {toots, boots, iconicQueens, cringeQueens, queenOfTheWeek})
router.post("/weeklySurvey", leagueOpsController.weeklySurvey);
// Doc: POST /leagueOps/addUserToLeague - Adds a user to an existing league (body: {username, teamName, leagueName, queens, franchise, season})
router.post('/addUserToLeague', leagueOpsController.addUserToLeague);
// Doc: POST /leagueOps/removeUserFromLeague - Removes a user from a league (body: {email, leagueName, franchise, season})
router.post('/removeUserFromLeague', leagueOpsController.removeUserFromLeague);
// Doc: POST /leagueOps/getAllLeagueRosters - Retrieves all rosters for a specific league (body: {email, token, leagueName})
router.post("/getAllLeagueRosters", leagueOpsController.getAllRostersByLeague);
// Doc: POST /leagueOps/addRoster - Creates a new roster record (body: {leagueName, email, teamName, queens, franchise, season})
router.post("/addRoster", leagueOpsController.addRoster);
// Doc: POST /leagueOps/submitFanSurvey - Store one fan survey response per user per episode (body: {franchise, season, episode, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed})
router.post("/submitFanSurvey", leagueOpsController.submitFanSurvey);
// Doc: POST /leagueOps/computeFanSurvey - Tally votes and apply point adjustments after the Fri-Thu window closes (body: {franchise, season, episode})
router.post("/computeFanSurvey", leagueOpsController.computeFanSurvey);

export default router;
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
// Doc: GET /leagueOps/getEpisodeHistory?franchise=&season= - Returns all EpisodeResult records for a franchise/season
router.get("/getEpisodeHistory", leagueOpsController.getEpisodeHistory);
// Doc: GET /leagueOps/getTalliedFanSurveyResults?franchise=&season= - Returns tallied fan survey results per episode
router.get("/getTalliedFanSurveyResults", leagueOpsController.getTalliedFanSurveyResults);

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
// Doc: POST /leagueOps/increaseLeagueSize - Increases the maxPlayers cap for a league (body: {leagueName, franchise, season, newMaxPlayers})
router.post("/increaseLeagueSize", leagueOpsController.increaseLeagueSize);
// Doc: GET /leagueOps/getOpenSurveys - Returns currently-open surveys for the authenticated user's franchise/seasons
router.get("/getOpenSurveys", leagueOpsController.getOpenSurveys);
// Doc: GET /leagueOps/getAllSurveys - Returns all surveys (open + closed) for the authenticated user's franchise/seasons
router.get("/getAllSurveys", leagueOpsController.getAllSurveys);
// Doc: POST /leagueOps/openFanSurvey - Opens (or updates) a survey window (body: {franchise, season, episode, startDate?, endDate?})
router.post("/openFanSurvey", leagueOpsController.openFanSurvey);
// Doc: POST /leagueOps/submitFanSurvey - Store one fan survey response per user per episode (body: {franchise, season, episode, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed})
router.post("/submitFanSurvey", leagueOpsController.submitFanSurvey);
// Doc: POST /leagueOps/computeFanSurvey - Tally votes and apply point adjustments after the Fri-Thu window closes (body: {franchise, season, episode})
router.post("/computeFanSurvey", leagueOpsController.computeFanSurvey);
// Doc: POST /leagueOps/submitSeasonFinale - Store one season finale survey response per user per season
router.post("/submitSeasonFinale", leagueOpsController.submitSeasonFinale);

export default router;
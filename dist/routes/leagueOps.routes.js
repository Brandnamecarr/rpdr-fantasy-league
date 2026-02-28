"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Doc: Route definitions for league operations endpoints (roster management, weekly updates). All routes are protected by JWT authentication.
// Doc: Base path: /leagueOps (or similar, depending on app.ts configuration)
const express_1 = require("express");
const TokenManager_1 = require("../util/TokenManager");
const leagueOpsController = __importStar(require("../controllers/leagueOps.controller"));
const router = (0, express_1.Router)();
// Doc: Middleware to protect all routes in this router with JWT authentication
router.use(TokenManager_1.protect);
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
exports.default = router;

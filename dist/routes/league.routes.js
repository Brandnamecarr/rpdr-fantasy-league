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
// Doc: Route definitions for league management endpoints. All routes are protected by JWT authentication.
// Doc: Base path: /league (or similar, depending on app.ts configuration)
const express_1 = require("express");
const TokenManager_1 = require("../util/TokenManager");
const leagueController = __importStar(require("../controllers/league.controller"));
const router = (0, express_1.Router)();
// Doc: Middleware to protect all routes in this router with JWT authentication
router.use(TokenManager_1.protect);
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
exports.default = router;

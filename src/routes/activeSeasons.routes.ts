// Doc: Route definitions for active seasons endpoints. All routes are protected by JWT authentication.
// Doc: Base path: /activeSeasons (or similar, depending on app.ts configuration)
import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as activeSeasonsController from "../controllers/activeSeasons.controller";

const router = Router();

// Doc: Middleware to protect all routes in this router with JWT authentication
router.use(protect);

// Doc: GET /activeSeasons/getActiveSeasons - Retrieves all seasons with active status
router.get("/getActiveSeasons", activeSeasonsController.getActiveSeasons);
// Doc: GET /activeSeasons/getUpcomingSeasons - Retrieves all inactive/upcoming seasons
router.get("/getUpcomingSeasons", activeSeasonsController.getUpcomingSeasons);
// Doc: GET /activeSeasons/getAllSeasons - Retrieves all seasons regardless of status
router.get("/getAllSeasons", activeSeasonsController.getAllSeasons);

// Doc: POST /activeSeasons/addSeason - Creates a new season record (body: {franchise, season, isUsingBrackets?, bracketCount?})
router.post("/addSeason", activeSeasonsController.addSeason);
// Doc: POST /activeSeasons/updateSeason - Updates a season's activity status (body: {franchise, season, status})
router.post("/updateSeason", activeSeasonsController.updateSeason);

// Doc: POST /activeSeason/addBracket - Creates a bracket record (body: {franchise, season, bracketName, queens})
router.post("/addBracket", activeSeasonsController.addBracket);
// Doc: GET /activeSeason/getBrackets?franchise=&season= - Returns brackets for a season ordered A→B→C
router.get("/getBrackets", activeSeasonsController.getBrackets);


export default router;
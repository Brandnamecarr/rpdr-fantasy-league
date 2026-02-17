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
// Doc: GET /activeSeasons/getAllSeasons - Retrieves all seasons regardless of status
router.get("/getAllSeasons", activeSeasonsController.getAllSeasons);

// Doc: POST /activeSeasons/addSeason - Creates a new season record (body: {franchise, season})
router.post("/addSeason", activeSeasonsController.addSeason);
// Doc: POST /activeSeasons/updateSeason - Updates a season's activity status (body: {franchise, season, status})
router.post("/updateSeason", activeSeasonsController.updateSeason);


export default router;
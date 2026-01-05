import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as activeSeasonsController from "../controllers/activeSeasons.controller";

const router = Router();

// protects all routes //
router.use(protect);

router.get("/getActiveSeasons", activeSeasonsController.getActiveSeasons);
router.get("/getAllSeasons", activeSeasonsController.getAllSeasons);

router.post("/addSeason", activeSeasonsController.addSeason);
router.post("/updateSeason", activeSeasonsController.updateSeason);


export default router;
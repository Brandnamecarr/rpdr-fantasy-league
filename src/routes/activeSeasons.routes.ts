import { Router } from "express";
import * as activeSeasonsController from "../controllers/activeSeasons.controller";

const router = Router();

router.get("/getActiveSeasons", activeSeasonsController.getActiveSeasons);
router.get("/getAllSeasons", activeSeasonsController.getAllSeasons);

router.post("/addSeason", activeSeasonsController.addSeason);
router.post("/updateSeason", activeSeasonsController.updateSeason);


export default router;
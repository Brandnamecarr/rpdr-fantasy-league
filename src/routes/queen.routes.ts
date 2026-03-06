// Doc: Route definitions for queen management endpoints. All routes are protected by JWT authentication.
// Doc: Base path: /queens (or similar, depending on app.ts configuration)
import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as queenController from '../controllers/queen.controller';

const router = Router();
// Doc: Middleware to protect all routes in this router with JWT authentication
router.use(protect);

// Doc: GET /queens/getAll - Retrieves all queen records
router.get("/getAll", queenController.getAllQueens);
// Doc: GET /queens/getQueenByName?name=QueenName - Retrieves all records for a specific queen by name
router.get("/getQueenByName", queenController.getQueenByName);
// Doc: GET /queens/getQueensByFranSeas?franchise=US&season=16 - Retrieves all queens for a franchise and season
router.get("/getQueensByFranSeas", queenController.getByFranchiseAndSeason);
// Doc: GET /queens/getQueenStatus?franchise=US&season=16&name=QueenName - Retrieves a queen's status
router.get("/getQueenStatus", queenController.getQueenStatus);

// Doc: POST /queens/addNewQueen - Creates a new queen record (body: {name, franchise, season, status, location})
router.post("/addNewQueen", queenController.addNewQueen);
// Doc: POST /queens/addNewQueens - Creates multiple queen records in bulk (body: array of queen objects)
router.post("/addNewQueens", queenController.addNewQueens);
// Doc: POST /queens/updateQueenStatus - Updates a queen's status (body: {name, franchise, season, status})
router.post("/updateQueenStatus", queenController.updateQueenStatus);
// Doc: POST /queens/getQueenId - Retrieves a queen's ID (body: {franchise, season, name})
router.post("/getQueenId", queenController.getQueenId);

export default router;
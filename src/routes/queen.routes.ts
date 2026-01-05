import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as queenController from '../controllers/queen.controller';

const router = Router();
router.use(protect);

router.get("/getAll", queenController.getAllQueens);
router.get("/getQueenByName", queenController.getQueenByName);
router.get("/getQueensByFranSeas", queenController.getByFranchiseAndSeason);
router.get("/getQueenStatus", queenController.getQueenStatus);

router.post("/addNewQueen", queenController.addNewQueen);
router.post("/addNewQueens", queenController.addNewQueens);
router.post("/updateQueenStatus", queenController.updateQueenStatus);
router.post("/getQueenId", queenController.getQueenId);

export default router;
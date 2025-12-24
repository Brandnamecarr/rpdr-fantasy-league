import { Router } from "express";
import * as queenController from '../controllers/queen.controller';

const router = Router();

router.get("/getAll", queenController.getAllQueens);
router.get("/getQueenByName", queenController.getQueenByName);
router.get("/getQueensByFranSeas", queenController.getByFranchiseAndSeason);
router.get("/getQueenStatus", queenController.getQueenStatus);

router.post("/addNewQueen", queenController.addNewQueen);
router.post("/addNewQueens", queenController.addNewQueens);
router.post("/updateQueenStatus", queenController.updateQueenStatus);

export default router;
import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as userController from "../controllers/user.controller";

const router = Router();

router.post("/auth", userController.authenticateUser);
router.post("/create", userController.createUser);

router.get("/getAll", protect, userController.getUsers);
router.post("/updatePassword", protect, userController.updatePassword);
router.get('/getUserRecord', protect, userController.getUserRecord);
router.get('/getAllEmails', protect, userController.getAllEmails);

export default router;
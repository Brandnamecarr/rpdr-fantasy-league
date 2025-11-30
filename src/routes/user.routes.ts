import { Router } from "express";
import * as userController from "../controllers/user.controller";

const router = Router();

router.get("/getAll", userController.getUsers);
router.post("/create", userController.createUser);
router.post("/auth", userController.authenticateUser);
router.get('/getUserRecord', userController.getUserRecord);

export default router;
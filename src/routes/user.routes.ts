import { Router } from "express";
import { getUsers, createUser, authenticateUser } from "../controllers/user.controller";

const router = Router();

router.get("/getAll", getUsers);
router.post("/create", createUser);
router.post("/auth", authenticateUser);

export default router;
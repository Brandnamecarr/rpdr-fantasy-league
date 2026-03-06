// Doc: Route definitions for user management endpoints. Auth and create routes are public; other routes require JWT authentication.
// Doc: Base path: /users (or similar, depending on app.ts configuration)
import { Router } from "express";
import { protect } from "../util/TokenManager";
import * as userController from "../controllers/user.controller";

const router = Router();

// Doc: POST /users/auth - Authenticates a user and returns JWT token (body: {email, password}) - Public route
router.post("/auth", userController.authenticateUser);
// Doc: POST /users/create - Creates a new user account and returns JWT token (body: {email, password}) - Public route
router.post("/create", userController.createUser);

// Doc: GET /users/getAll - Retrieves all users (protected route)
router.get("/getAll", protect, userController.getUsers);
// Doc: POST /users/updatePassword - Updates a user's password (body: {email, oldPassword, newPassword}) - Protected route
router.post("/updatePassword", protect, userController.updatePassword);
// Doc: GET /users/getUserRecord?email=user@example.com - Retrieves a user's complete record with leagues and rosters (protected route)
router.get('/getUserRecord', protect, userController.getUserRecord);
// Doc: GET /users/getAllEmails - Retrieves all user email addresses (protected route)
router.get('/getAllEmails', protect, userController.getAllEmails);
// Doc: PATCH /users/displayName - Updates the authenticated user's display name (body: {displayName: string}) - Protected route
router.patch('/displayName', protect, userController.updateDisplayName);

export default router;
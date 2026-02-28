"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Doc: Route definitions for user management endpoints. Auth and create routes are public; other routes require JWT authentication.
// Doc: Base path: /users (or similar, depending on app.ts configuration)
const express_1 = require("express");
const TokenManager_1 = require("../util/TokenManager");
const userController = __importStar(require("../controllers/user.controller"));
const router = (0, express_1.Router)();
// Doc: POST /users/auth - Authenticates a user and returns JWT token (body: {email, password}) - Public route
router.post("/auth", userController.authenticateUser);
// Doc: POST /users/create - Creates a new user account and returns JWT token (body: {email, password}) - Public route
router.post("/create", userController.createUser);
// Doc: GET /users/getAll - Retrieves all users (protected route)
router.get("/getAll", TokenManager_1.protect, userController.getUsers);
// Doc: POST /users/updatePassword - Updates a user's password (body: {email, oldPassword, newPassword}) - Protected route
router.post("/updatePassword", TokenManager_1.protect, userController.updatePassword);
// Doc: GET /users/getUserRecord?email=user@example.com - Retrieves a user's complete record with leagues and rosters (protected route)
router.get('/getUserRecord', TokenManager_1.protect, userController.getUserRecord);
// Doc: GET /users/getAllEmails - Retrieves all user email addresses (protected route)
router.get('/getAllEmails', TokenManager_1.protect, userController.getAllEmails);
exports.default = router;

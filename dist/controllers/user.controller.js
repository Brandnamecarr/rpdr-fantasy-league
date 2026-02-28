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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.authenticateUser = exports.getUserRecord = exports.createUser = exports.getAllEmails = exports.getUsers = void 0;
const userService = __importStar(require("../services/user.service"));
const passwordManager = __importStar(require("../util/PasswordManager"));
const tokenManager = __importStar(require("../util/TokenManager"));
const notificationService = __importStar(require("../services/notification.service"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Retrieves all user records from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /users
const getUsers = async (req, res) => {
    const users = await userService.getUsers();
    if (!users) {
        LoggerImpl_1.default.error(`User.Controller.ts: Error fetching users from database`);
        return res.status(404).json({ Error: `Unable to get users from database` });
    }
    LoggerImpl_1.default.debug(`User.Controller.ts -> returning ${users.length} user records`);
    res.json(users);
};
exports.getUsers = getUsers;
// Doc: Retrieves all user email addresses from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /users/emails
const getAllEmails = async (req, res) => {
    const emails = await userService.getAllEmails();
    if (emails) {
        LoggerImpl_1.default.debug('User.Controller.ts: Got list of emails');
        res.status(201).json(emails);
    }
    else {
        LoggerImpl_1.default.error(`User.Controller.ts -> error in getAllEmails: unable to get emails from database`);
        res.status(500).json({ Error: 'No emails in database' });
    }
};
exports.getAllEmails = getAllEmails;
// Doc: Creates a new user account with hashed password and returns user data with JWT token.
// Doc: Args: req (Request) - Express request object with body containing {email: string, password: string}, res (Response) - Express response object
// Doc: Route: Likely POST /users/register or POST /users
const createUser = async (req, res) => {
    const { email, password } = req.body;
    LoggerImpl_1.default.debug('User.Controller.ts: createUser() called with email: ', { email: email, password: password });
    // handle the hashing of the password here //
    try {
        const hashedPassword = await passwordManager.hashPassword(password);
        if (hashedPassword === '' || !hashedPassword) {
            LoggerImpl_1.default.error('User.Controller.ts: error hashing password');
            return res.json(404).json({ Error: "Unable to hash password, not ceating user" });
        }
        const user = await userService.createUser(email, hashedPassword);
        LoggerImpl_1.default.debug('User.Controller.ts: returning status=201, ', { userData: user });
        // provide token when user is created //
        let userTokenPayload = { id: user.id, email: user.email };
        const token = tokenManager.generateToken(userTokenPayload);
        return res.status(201).json({
            user: user,
            token: token
        });
    }
    catch (error) {
        LoggerImpl_1.default.error('User.Controller.ts: error creating user, returning 500, error: ', { error: error });
        res.status(500).json({ Error: "Failed to create user" });
    }
};
exports.createUser = createUser;
// Doc: Retrieves a specific user's record by email address.
// Doc: Args: req (Request) - Express request object with query parameter email (string), res (Response) - Express response object
// Doc: Route: Likely GET /users/record?email=user@example.com
const getUserRecord = async (req, res) => {
    const email = req.query.email;
    if (!email) {
        LoggerImpl_1.default.error('User.Controller.ts -> missing or invalid query param: email... ', { email: email });
        return res.status(404).json({ Message: "Missing required 'email' field" });
    }
    LoggerImpl_1.default.debug('User.Controller.ts: Loading user record for: ', { email: email });
    try {
        const userRecord = await userService.getUserRecord(email);
        res.status(201).json(userRecord);
    }
    catch (error) {
        LoggerImpl_1.default.error('User.Controller.ts: Error loading user record: ', { email: email });
        res.status(500).json({ Error: `Error loading record for user ${email}` });
    }
};
exports.getUserRecord = getUserRecord;
// Doc: Authenticates a user by verifying email and password, returns JWT token on success.
// Doc: Args: req (Request) - Express request object with body containing {email: string, password: string}, res (Response) - Express response object
// Doc: Route: Likely POST /users/login or POST /users/auth
const authenticateUser = async (req, res) => {
    const { email, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    LoggerImpl_1.default.info("User.Controller: authenticateUser() - Authentication attempt initiated", { email, clientIP });
    // Validate input
    if (!email || !password) {
        LoggerImpl_1.default.error('User.Controller: authenticateUser() - Missing email or password in request', { email: email, hasPassword: !!password });
        return res.status(400).json({ Error: "Email and password are required" });
    }
    try {
        LoggerImpl_1.default.debug('User.Controller: authenticateUser() - Fetching user record from database', { email });
        const userRecord = await userService.getUserByName(email);
        if (!userRecord) {
            LoggerImpl_1.default.error('User.Controller: authenticateUser() - Authentication failed: User not found', { email, clientIP });
            return res.status(404).json({ Error: "User not found" });
        }
        LoggerImpl_1.default.debug('User.Controller: authenticateUser() - User found, verifying password', { email, userId: userRecord.id });
        const passwordsDoMatch = await passwordManager.comparePassword(password, userRecord.password);
        if (!passwordsDoMatch) {
            LoggerImpl_1.default.error('User.Controller: authenticateUser() - Authentication failed: Invalid password', { email, userId: userRecord.id, clientIP });
            return res.status(401).json({ Error: "Invalid Password" });
        }
        LoggerImpl_1.default.info('User.Controller: authenticateUser() - Authentication successful, generating token', { email, userId: userRecord.id });
        let userTokenPayload = { id: userRecord.id, email: userRecord.email };
        const token = tokenManager.generateToken(userTokenPayload);
        LoggerImpl_1.default.info('User.Controller: authenticateUser() - Login successful, token issued', { email, userId: userRecord.id, clientIP });
        return res.status(200).json({
            status: "Login Successful",
            email: email,
            token: token
        });
    }
    catch (error) {
        LoggerImpl_1.default.error('User.Controller: authenticateUser() - Unexpected error during authentication', { email, error: error, clientIP });
        res.status(500).json({ Error: "Server Error" });
    }
};
exports.authenticateUser = authenticateUser;
// Doc: Updates a user's password after verifying the old password, creates a notification.
// Doc: Args: req (Request) - Express request object with body containing {email: string, oldPassword: string, newPassword: string}, res (Response) - Express response object
// Doc: Route: Likely PUT /users/password or PATCH /users/password
const updatePassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    LoggerImpl_1.default.info('User.Controller.ts: updatePassword() - request received', { email });
    const userRecord = await userService.getUserByName(email);
    if (!userRecord) {
        LoggerImpl_1.default.error('User.Controller.ts: updatePassword() - user not found in database', { email });
        return res.status(404).json({ Error: `User ${email} not found in database` });
    }
    LoggerImpl_1.default.debug('User.Controller.ts: updatePassword() - verifying old password', { email });
    const passwordsDoMatch = await passwordManager.comparePassword(oldPassword, userRecord.password);
    if (!passwordsDoMatch) {
        LoggerImpl_1.default.error('User.Controller.ts: updatePassword() - old password does not match', { email });
        return res.status(404).json({ Error: `Password for ${email} does not match records` });
    }
    LoggerImpl_1.default.debug('User.Controller.ts: updatePassword() - old password verified, hashing new password', { email });
    const newHashedPw = await passwordManager.hashPassword(newPassword);
    try {
        let response = await userService.updatePassword(email, newHashedPw);
        if (!response) {
            LoggerImpl_1.default.error('User.Controller.ts: updatePassword() - service returned null', { email });
            return res.status(500).json({ Error: `Failed to update password for ${email}` });
        }
        let tempNotif = notificationService.makeNewNotification("SERVER", userRecord.email, "Your password has been updated");
        LoggerImpl_1.default.info('User.Controller.ts: updatePassword() - password updated successfully', { email });
        return res.status(201).json({ Message: `Successfully updated password for ${email}` });
    }
    catch (error) {
        LoggerImpl_1.default.error('User.Controller.ts: updatePassword() - unexpected error', { email, error });
        return res.status(500).json({ Error: `Error updating password for ${email}` });
    }
};
exports.updatePassword = updatePassword;

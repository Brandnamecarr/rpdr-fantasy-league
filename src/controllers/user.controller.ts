import { Request, Response } from "express";
import * as userService from "../services/user.service";
import * as passwordManager from "../util/PasswordManager";
import * as tokenManager from '../util/TokenManager';
import * as notificationService from '../services/notification.service';
import logger from "../util/LoggerImpl";
import { AuthRequest, UserTokenPayload } from "../types/Interfaces";

// Doc: Retrieves all user records from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /users
export const getUsers = async (req: Request, res: Response) => {
    const users = await userService.getUsers();
    if(!users) {
        logger.error(`User.Controller.ts: Error fetching users from database`);
        return res.status(404).json({Error: `Unable to get users from database`});
    }
    logger.debug(`User.Controller.ts -> returning ${users.length} user records`);
    res.json(users);
};

// Doc: Retrieves all user email addresses from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /users/emails
export const getAllEmails = async (req: Request, res: Response) => {
    const emails = await userService.getAllEmails();
    if(emails) {
        logger.debug('User.Controller.ts: Got list of emails');
        res.status(201).json(emails);
    } else {
        logger.error(`User.Controller.ts -> error in getAllEmails: unable to get emails from database`);
        res.status(500).json({Error: 'No emails in database'});
    }
};

// Doc: Creates a new user account with hashed password and returns user data with JWT token.
// Doc: Args: req (Request) - Express request object with body containing {email: string, password: string}, res (Response) - Express response object
// Doc: Route: Likely POST /users/register or POST /users
export const createUser = async (req: Request, res: Response) => {
    const {email, password} = req.body;
    logger.debug('User.Controller.ts: createUser() called with email: ', {email:email, password:password});

    // handle the hashing of the password here //
    try {
        const hashedPassword = await passwordManager.hashPassword(password);
        if(hashedPassword === '' || !hashedPassword) {
            logger.error('User.Controller.ts: error hashing password');
            return res.json(404).json({Error: "Unable to hash password, not ceating user"});
        }
        const user = await userService.createUser(email, hashedPassword);
        logger.debug('User.Controller.ts: returning status=201, ', {userData: user});

        // provide token when user is created //
        let userTokenPayload: UserTokenPayload = {id: user.id, email: user.email};
        const token = tokenManager.generateToken(userTokenPayload);
        return res.status(201).json({
            user: user,
            token: token
        }); 
    } catch(error) {
        logger.error('User.Controller.ts: error creating user, returning 500, error: ', {error:error});
        res.status(500).json({Error: "Failed to create user"});
    }
};

// Doc: Retrieves a specific user's record by email address.
// Doc: Args: req (Request) - Express request object with query parameter email (string), res (Response) - Express response object
// Doc: Route: Likely GET /users/record?email=user@example.com
export const getUserRecord = async (req: Request, res: Response) => {
    const email = req.query.email as string | undefined;
    if(!email) {
        logger.error('User.Controller.ts -> missing or invalid query param: email... ', {email: email});
        return res.status(404).json({Message: "Missing required 'email' field"});
    }
    logger.debug('User.Controller.ts: Loading user record for: ', {email:email});
    try {
        const userRecord = await userService.getUserRecord(email);
        res.status(201).json(userRecord);
    } catch(error) {    
        logger.error('User.Controller.ts: Error loading user record: ', {email: email});
        res.status(500).json({Error: `Error loading record for user ${email}`});
    }
};


// Doc: Authenticates a user by verifying email and password, returns JWT token on success.
// Doc: Args: req (Request) - Express request object with body containing {email: string, password: string}, res (Response) - Express response object
// Doc: Route: Likely POST /users/login or POST /users/auth
export const authenticateUser = async (req: Request, res: Response) => {
    const {email, password} = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.info("User.Controller: authenticateUser() - Authentication attempt initiated", {email, clientIP});

    // Validate input
    if(!email || !password) {
        logger.error('User.Controller: authenticateUser() - Missing email or password in request', {email: email, hasPassword: !!password});
        return res.status(400).json({Error: "Email and password are required"});
    }

    try {
        logger.debug('User.Controller: authenticateUser() - Fetching user record from database', {email});
        const userRecord = await userService.getUserByName(email);

        if(!userRecord) {
            logger.error('User.Controller: authenticateUser() - Authentication failed: User not found', {email, clientIP});
            return res.status(404).json({Error: "User not found"});
        }

        logger.debug('User.Controller: authenticateUser() - User found, verifying password', {email, userId: userRecord.id});
        const passwordsDoMatch = await passwordManager.comparePassword(password, userRecord.password);

        if(!passwordsDoMatch) {
            logger.error('User.Controller: authenticateUser() - Authentication failed: Invalid password', {email, userId: userRecord.id, clientIP});
            return res.status(401).json({Error: "Invalid Password"});
        }

        logger.info('User.Controller: authenticateUser() - Authentication successful, generating token', {email, userId: userRecord.id});

        let userTokenPayload: UserTokenPayload = {id: userRecord.id, email: userRecord.email};
        const token = tokenManager.generateToken(userTokenPayload);

        logger.info('User.Controller: authenticateUser() - Login successful, token issued', {email, userId: userRecord.id, clientIP});

        return res.status(200).json({
            status: "Login Successful",
            email: email,
            displayName: userRecord.displayName,
            token: token
        });
    } catch(error) {
        logger.error('User.Controller: authenticateUser() - Unexpected error during authentication', {email, error: error, clientIP});
        res.status(500).json({Error: "Server Error"});
    }
};

// Doc: Updates the display name for the authenticated user.
// Doc: Args: req (AuthRequest) - Express request with JWT user, res (Response) - Express response object
// Doc: Route: PATCH /users/displayName
export const updateDisplayName = async (req: AuthRequest, res: Response) => {
    const { displayName } = req.body;
    const email = req.user!.email;

    if (!displayName) {
        logger.error('User.Controller.ts: updateDisplayName() - missing displayName in body', {email});
        return res.status(400).json({ Error: 'displayName is required' });
    }

    logger.info('User.Controller.ts: updateDisplayName() - request received', {email, displayName});
    try {
        const updated = await userService.updateDisplayName(email, displayName);
        logger.info('User.Controller.ts: updateDisplayName() - updated successfully', {email, displayName: updated.displayName});
        return res.status(200).json({ displayName: updated.displayName });
    } catch(error) {
        logger.error('User.Controller.ts: updateDisplayName() - unexpected error', {email, error});
        return res.status(500).json({ Error: `Error updating display name for ${email}` });
    }
};

// Doc: Updates a user's password after verifying the old password, creates a notification.
// Doc: Args: req (Request) - Express request object with body containing {email: string, oldPassword: string, newPassword: string}, res (Response) - Express response object
// Doc: Route: Likely PUT /users/password or PATCH /users/password
export const updatePassword = async (req: Request, res: Response) => {
    const {email, oldPassword, newPassword} = req.body;

    logger.info('User.Controller.ts: updatePassword() - request received', {email});
    const userRecord = await userService.getUserByName(email);
    if(!userRecord) {
        logger.error('User.Controller.ts: updatePassword() - user not found in database', {email});
        return res.status(404).json({Error: `User ${email} not found in database`});
    }
    logger.debug('User.Controller.ts: updatePassword() - verifying old password', {email});
    const passwordsDoMatch = await passwordManager.comparePassword(oldPassword, userRecord.password);
    if(!passwordsDoMatch) {
        logger.error('User.Controller.ts: updatePassword() - old password does not match', {email});
        return res.status(404).json({Error: `Password for ${email} does not match records`});
    }
    logger.debug('User.Controller.ts: updatePassword() - old password verified, hashing new password', {email});
    const newHashedPw = await passwordManager.hashPassword(newPassword);
    try {
        let response = await userService.updatePassword(email, newHashedPw);
        if(!response) {
            logger.error('User.Controller.ts: updatePassword() - service returned null', {email});
            return res.status(500).json({Error: `Failed to update password for ${email}`});
        }
        let tempNotif = notificationService.makeNewNotification("SERVER", userRecord.email, "Your password has been updated");
        logger.info('User.Controller.ts: updatePassword() - password updated successfully', {email});
        return res.status(201).json({Message: `Successfully updated password for ${email}`});
    } catch(error) {
        logger.error('User.Controller.ts: updatePassword() - unexpected error', {email, error});
        return res.status(500).json({Error: `Error updating password for ${email}`});
    }
};
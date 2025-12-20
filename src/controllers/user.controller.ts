import { Request, Response } from "express";
import * as userService from "../services/user.service";
import * as passwordManager from "../util/PasswordManager";
import * as notificationService from '../services/notification.service';
import logger from "../util/LoggerImpl";

// returns all users //
export const getUsers = async (req: Request, res: Response) => {
    const users = await userService.getUsers();
    res.json(users);
};

export const getAllEmails = async (req: Request, res: Response) => {
    const emails = await userService.getAllEmails();
    if(emails) {
        logger.debug('User.Controller.ts: Got list of emails');
        res.status(201).json(emails);
    } else {
        res.status(500).json({error: 'No emails in database'});
    }
};

// could override the Request here with a custom CreateRequest to make the code cleaner. //
export const createUser = async (req: Request, res: Response) => {
    const {email, password} = req.body;
    logger.debug('User.Controller.ts: createUser() called with email: ', {email:email, password:password});
    // handle the hashing of the password here //
    try {
        const hashedPassword = await passwordManager.hashPassword(password);
        const user = await userService.createUser(email, hashedPassword);
        logger.debug('User.Controller.ts: returning status=201');
        res.status(201).json({email:email});
    } catch(error) {
        logger.error('User.Controller.ts: error creating user, returning 500, error: ', {error:error});
        res.status(500).json({error: "Failed to create user"});
    }
};

// loads user record by name //
export const getUserRecord = async (req: Request, res: Response) => {
    const email = req.query.email as string | undefined;
    if(!email) {
        return res.status(400).json({message: "Missing required 'email' field"});
    }
    logger.debug('User.Controller.ts: Loading user record for: ', {email:email});
    try {
        const userRecord = await userService.getUserRecord(email);
        res.status(201).json({email: email, payload: userRecord});
    } catch(error) {    
        logger.error('User.Controller.ts: Error loading user record: ', {email: email});
        res.status(500).json({email:email, message:"Error finding user in database", error: error});
    }
};


// authenticate user //
export const authenticateUser = async (req: Request, res: Response) => {
    const {email, password} = req.body;
    logger.debug("User.Controller.ts: authenticateUser() for : ", {username: email, password:password});
    try {
        const userRecord = await userService.getUserByName(email);
        if(!userRecord) {
            logger.error('User.Controller.ts: User record not found for user, returning 400, user: ', {email:email});
            console.error('User.Controller.ts: User Record not found for user, returning 400, user: ', {email: email});
            return res.status(404).json({error: "User not found"});
        }
        logger.debug('User.Controller.ts: User data: ', {data: userRecord});
        const passwordsDoMatch = await passwordManager.comparePassword(password, userRecord.password);
        if(!passwordsDoMatch) {
            logger.debug('User.Controller.ts: Passwords dont match, returning 401.', {});
            return res.status(401).json({error: "Invalid Password"});
        }
        logger.debug('User.Controller.ts: Login successful for user: ', {email: email});
        res.json({status: "Login Successful", email: email});
    } catch(error) {
        console.error(error);
        logger.error('User.Controller.ts: error processing authentication.', {error: error});
        res.status(500).json({error: "Server Error"});
    }
}; // authenticate user //

export const updatePassword = async (req: Request, res: Response) => {
    const {email, oldPassword, newPassword} = req.body;

    logger.debug(`User.Controller.ts: Updating Password for user ${email}`);
    const userRecord = await userService.getUserByName(email);
    if(!userRecord) {
        return res.status(404).json({Error: `User ${email} not found in database`});
    }
    const passwordsDoMatch = await passwordManager.comparePassword(oldPassword, userRecord.password);
    if(!passwordsDoMatch) {
        return res.status(404).json({Error: `Password for ${email} does not match records`});
    }
    const newHashedPw = await passwordManager.hashPassword(newPassword);
    try {
        let response = await userService.updatePassword(email, newHashedPw);
        if(!response) {
            return res.status(500).json({Error: `Failed to update password for ${email}`});
        }
        let tempNotif = notificationService.makeNewNotification("SERVER", userRecord.email, "Your password has been updated");
        return res.status(201).json({message: `Successfully updated password for ${email}`});
    } catch(error) {
        logger.error('User.Controller.ts: Error in updatePassword: ', {error: error});
        return res.status(500).json({Error: `Error updating password for ${email}`});
    }
};
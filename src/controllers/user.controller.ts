import { Request, Response } from "express";
import * as userService from "../services/user.service";
import * as passwordManager from "../util/PasswordManager";
import logger from "../util/LoggerImpl";

// returns all users //
export const getUsers = async (req: Request, res: Response) => {
    const users = await userService.getUsers();
    res.json(users);
};

export const getAllEmails = async (req: Request, res: Response) => {
    const emails = await userService.getAllEmails();
    if(emails) {
        logger.info('User.Controller.ts: Got list of emails');
        res.status(201).json(emails);
    } else {
        res.status(500).json({error: 'No emails in database'});
    }
};

// could override the Request here with a custom CreateRequest to make the code cleaner. //
export const createUser = async (req: Request, res: Response) => {
    const {email, password} = req.body;
    logger.info('User.Controller.ts: createUser() called with email: ', {email:email, password:password});
    // handle the hashing of the password here //
    try {
        const hashedPassword = await passwordManager.hashPassword(password);
        const user = await userService.createUser(email, hashedPassword);
        logger.info('User.Controller.ts: returning status=201');
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
    logger.info('User.Controller.ts: Loading user record for: ', {email:email});
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
    logger.info("User.Controller.ts: authenticateUser() for : ", {username: email, password:password});
    try {
        const userRecord = await userService.getUserByName(email);
        if(!userRecord) {
            logger.error('User.Controller.ts: User record not found for user, returning 400, user: ', {email:email});
            console.error('User.Controller.ts: User Record not found for user, returning 400, user: ', {email: email});
            return res.status(404).json({error: "User not found"});
        }
        logger.info('User.Controller.ts: User data: ', {data: userRecord});
        const passwordsDoMatch = await passwordManager.comparePassword(password, userRecord.password);
        if(!passwordsDoMatch) {
            logger.info('User.Controller.ts: Passwords dont match, returning 401.', {});
            return res.status(401).json({error: "Invalid Password"});
        }
        logger.info('User.Controller.ts: Login successful for user: ', {email: email});
        res.json({status: "Login Successful", email: email});
    } catch(error) {
        console.error(error);
        logger.error('User.Controller.ts: error processing authentication.', {error: error});
        res.status(500).json({error: "Server Error"});
    }
}; // authenticate user //
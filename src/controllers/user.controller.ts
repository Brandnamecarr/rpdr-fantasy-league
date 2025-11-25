import { Request, Response } from "express";
import * as userService from "../services/user.service";
import * as passwordManager from "../util/PasswordManager";
import logger from "../util/LoggerImpl";

// returns all users //
export const getUsers = async (req: Request, res: Response) => {
    const users = await userService.getUsers();
    res.json(users);
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
        res.status(201).json(user);
    } catch(error) {
        console.error(error);
        logger.error('User.Controller.ts: error creating user, returning 500, error: ', {error:error});
        res.status(500).json({error: "Failed to create user"});
    }
};

// authenticate user //
export const authenticateUser = async (req: Request, res: Response) => {
    const {username, password} = req.body;
    logger.info("User.Controller.ts: authenticateUser() for : ", {username: username, password:password});
    try {
        const userRecord = await userService.getUserByName(username);
        if(!userRecord) {
            console.error('User.Controller.ts: User Record not found for user, returning 400, user: ', {username: username});
            return res.status(404).json({error: "User not found"});
        }
        logger.info('User.Controller.ts: User data: ', {data: userRecord});
        const passwordsDoMatch = await passwordManager.comparePassword(password, userRecord.password);
        if(!passwordsDoMatch) {
            logger.info('User.Controller.ts: Passwords dont match, returning 401.', {});
            return res.status(401).json({error: "Invalid Password"});
        }
        logger.info('User.Controller.ts: Login successful for user: ', {username: username});
        res.json({status: "Login Successful"});
    } catch(error) {
        console.error(error);
        logger.error('User.Controller.ts: error processing authentication.', {error: error});
        res.status(500).json({error: "Server Error"});
    }
}; // authenticate user //
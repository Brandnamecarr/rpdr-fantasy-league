import { Request, Response } from "express";
import * as userService from "../services/user.service";
import * as passwordManager from "../util/PasswordManager";

// returns all users //
export const getUsers = async (req: Request, res: Response) => {
    const users = await userService.getUsers();
    res.json(users);
};

// could override the Request here with a custom CreateRequest to make the code cleaner. //
export const createUser = async (req: Request, res: Response) => {
    const {username, email, password, teamName, queens} = req.body;
    
    // handle the hashing of the password here //
    try {
        const hashedPassword = await passwordManager.hashPassword(password);
        const user = await userService.createUser(username, email, hashedPassword, teamName, queens);
        res.status(201).json(user);
    } catch(error) {
        console.error(error);
        res.status(500).json({error: "Failed to create user"});
    }
};

// authenticate user //
export const authenticateUser = async (req: Request, res: Response) => {
    console.log('here');
    const {username, password} = req.body;
    console.log(username);
    console.log(password);
    try {
        const userRecord = await userService.getUserByName(username);
        if(!userRecord) {
            return res.status(404).json({error: "User not found"});
        }
        console.log('got user record');
        console.log('PT pw: ', userRecord.password);
        const passwordsDoMatch = await passwordManager.comparePassword(password, userRecord.password);
        if(!passwordsDoMatch) {
            console.log('returning 401');
            return res.status(401).json({error: "Invalid Password"});
        }
        console.log('passwords match!');
        res.json({status: "Login Successful"});
    } catch(error) {
        console.error(error);
        res.status(500).json({error: "Server Error"});
    }
}; // authenticate user //
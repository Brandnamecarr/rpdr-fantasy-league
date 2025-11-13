import { readJsonFile } from "./FileParser";
import { Queen } from "../types/Queens";

// reads username/password data
// returns True or False if user is authenticated or not
export async function authUser(username: string, password: string): Promise<boolean> {
    console.log("Auth.ts::authUser() -> authenticating ${username}");
    try {
        const users = readJsonFile('../database/users.json');
        const temp = JSON.parse(users);
        const user = temp.Users[username];
        // TODO: More validation here.
        return true;
    }
    catch (error) {
        console.error('An error occurred while authenticating user: ', username);
        return false;
    }

    return true;
}

// registers user to the league
// username, password (self-explanatory)
// array of queens to register to the user's team
export async function registerUser(username: string, password: string, team_name: string, queens: Array<Queen>): Promise<boolean> {
    return true;
}
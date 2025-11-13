import { readJsonFile } from "./FileParser";
// import { Queen } from "../types/Queens";

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


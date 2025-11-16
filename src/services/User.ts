import { Queen } from "../types/Queens";
import { User } from "../types/User";
import { DataService } from "./DataService";

import { hashPassword } from "../util/PasswordManager";

// registers user to the league
// username, password (self-explanatory)
// array of queens to register to the user's team
export async function registerUser(username: string, email: string, password: string, team_name: string, queens: Array<Queen>): Promise<boolean> {
    let hashedPassword = await hashPassword(password);
    let user = new User(username, email, hashedPassword, team_name, 0, 0, queens);
    // push to DB //
    return true;
}
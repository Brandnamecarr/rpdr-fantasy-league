import { Queen } from "../types/Queens";
import { User } from "../types/User";
import { DataService } from "./DataService";

// registers user to the league
// username, password (self-explanatory)
// array of queens to register to the user's team
export async function registerUser(username: string, password: string, team_name: string, queens: Array<Queen>): Promise<boolean> {
    let user = new User(username, password, team_name, 0, 0, queens);
    return true;
}
import { Queen } from "./Queens";

export class User {
    username: string;
    password: string;
    team_name: string;
    points: number;
    rank: number;
    queens: Array<Queen>;

    constructor(username: string, password: string, team_name: string, points: number, rank: number, queens:Array<Queen>) {
        this.username = username;
        this.password = password;
        this.team_name = team_name;
        this.points = points;
        this.rank = rank;
        this.queens = queens;
    }
}
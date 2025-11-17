import { Queen } from "./Queen";

export class User {
    username: string;
    email: string;
    password: string;
    team_name: string;
    points: number;
    rank: number;
    queens: Array<Queen>;

    constructor(username: string, email: string, password: string, team_name: string, points: number, rank: number, queens:Array<Queen>) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.team_name = team_name;
        this.points = points;
        this.rank = rank;
        this.queens = queens;
    }
}
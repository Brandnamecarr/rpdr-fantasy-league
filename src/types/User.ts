import { Queen } from "./Queens";

export interface User {
    username: string;
    password: string;
    team_name: string;
    rank: number;
    queens: Array<Queen>;
}
// defines some common interfaces //
import { Request } from "express";
import { QueenStatus } from "@prisma/client";

export interface UserTokenPayload {
    id: number;
    email: string;
}

export interface AuthRequest extends Request {
    user?: UserTokenPayload;
}

export interface QueenInput {
    name: string;
    franchise: string;
    season: number;
    location: string;
    status: QueenStatus;
}

export interface CreateLeagueInput {
    leaguename: string;
    owner: string;
    users: string[];
    maxPlayers: number;
    maxQueensPerTeam: number;
    franchise: string;
    season: number;
    teamName: string;
    queens: string[];
}
// Doc: Common TypeScript interfaces used throughout the application.
// Doc: Defines data structures for authentication, requests, and input payloads.
import { Request } from "express";
import { QueenStatus } from "@prisma/client";

// Doc: Payload structure for JWT tokens containing user identification
// Doc: Properties: id (number) - user ID, email (string) - user email address
export interface UserTokenPayload {
    id: number;
    email: string;
}

// Doc: Extended Express Request with authenticated user information
// Doc: Properties: user (UserTokenPayload?) - optional decoded JWT payload attached by auth middleware
export interface AuthRequest extends Request {
    user?: UserTokenPayload;
}

// Doc: Input structure for creating new queen records
// Doc: Properties: name (string), franchise (string), season (number), location (string), status (QueenStatus)
export interface QueenInput {
    name: string;
    franchise: string;
    season: number;
    location: string;
    status: QueenStatus;
}

// Doc: Input structure for creating new league records
// Doc: Properties: leaguename (string), owner (string), users (string[]), maxPlayers (number), maxQueensPerTeam (number), franchise (string), season (number), teamName (string), queens (string[])
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
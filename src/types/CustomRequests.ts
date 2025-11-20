import {Request} from 'express';

export interface LoginRequest extends Request {
    body: {
        username?: string;
        password?: string;
    };
} // LoginRequest //

export interface RegistrationRequest extends Request {
    body: {
        username?: string;
        password?: string;
        team_name?: string;
        queens?: Array<string>;
    }
}

export interface LeagueCreationRequest extends Request {
    body: {
        leaguename?: string;
        maxPlayers?: number;
        owner?: string; // maybe ? // 
    }
}
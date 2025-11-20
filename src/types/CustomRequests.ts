import {Request} from 'express';
import { Queen } from './Queen';

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
        queens?: Array<Queen>;
    }
}

export interface LeagueCreationRequest extends Request {
    body: {
        leaguename?: string;
        maxPlayers?: number;
        owner?: string; // maybe ? // 
    }
}
import {Request} from 'express';
import { Queen } from './Queens';

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
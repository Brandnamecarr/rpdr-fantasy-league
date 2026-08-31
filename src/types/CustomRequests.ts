// Doc: Custom Express Request type definitions.
// Doc: Extends base Express Request types with specific body structures for different endpoints.
import {Request} from 'express';
import { UserTokenPayload } from './Interfaces';

export interface LoginRequest extends Request {
    body: {
        email?: string;
        password?: string;
    };
}

// Doc: Extended Express Request with authenticated user information
// Doc: Properties: user (UserTokenPayload?) - optional decoded JWT payload attached by auth middleware
export interface AuthRequest extends Request {
    user?: UserTokenPayload;
}

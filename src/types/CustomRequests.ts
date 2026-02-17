// Doc: Custom Express Request type definitions (currently unused, reserved for future use).
// Doc: Extends base Express Request types with specific body structures for different endpoints.
import {Request} from 'express';

// Doc: UNUSED - Reserved for future use
// Doc: LoginRequest interface with typed body containing username and password
export interface LoginRequest extends Request {
    body: {
        username?: string;
        password?: string;
    };
} // LoginRequest //

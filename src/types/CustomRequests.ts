// Doc: Custom Express Request type definitions.
// Doc: Extends base Express Request types with specific body structures for different endpoints.
import {Request} from 'express';

export interface LoginRequest extends Request {
    body: {
        email?: string;
        password?: string;
    };
}

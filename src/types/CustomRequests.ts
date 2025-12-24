import {Request} from 'express';

/**
 * User-defined request interfaces for various API endpoints.
 * These interfaces extend the base Express Request object
 * 
 * UNUSED RIGHT NOW, MAYBE LATER.
 */

export interface LoginRequest extends Request {
    body: {
        username?: string;
        password?: string;
    };
} // LoginRequest //

// Doc: JWT token management utilities for authentication and route protection.
// Doc: Includes functions for generating, verifying tokens, and protecting routes with middleware.
import jwt from 'jsonwebtoken';
import logger from './LoggerImpl';
import { NextFunction, Request, Response } from 'express';
import { AuthRequest, UserTokenPayload } from '../types/Interfaces';


// Doc: Secret key for JWT signing (TODO: move to environment variable)
const SECRET_KEY = 'testing'; //put this in a .env

// Doc: Generates a JWT token for a user with 1 hour expiration.
// Doc: Args: user (UserTokenPayload) - User payload containing id and email
// Doc: Returns: string - Signed JWT token
export const generateToken = (user: UserTokenPayload): string => {
    logger.debug('TokenManager.generateToken() -> generating userToken for: ', {user});
    return jwt.sign(user, SECRET_KEY, {expiresIn: '1h'});
};

// Doc: Verifies a JWT token and returns the decoded payload.
// Doc: Args: token (string) - The JWT token to verify
// Doc: Returns: UserTokenPayload | null - Decoded user payload or null if verification fails
export const verifyToken = (token: string) => {
    logger.debug(`TokenManager.verifyToken() -> token: ${token}`);
    try {
        const decoded = jwt.verify(token, SECRET_KEY) as UserTokenPayload;
        logger.debug('TokenManager.verifyToken() -> verifying ', {userId: decoded.id});
        return decoded;
    } catch(error) {
        logger.error('TokenManager.verifyToken() -> error verifying/invalid token', {token: token});
        return null;
    }
};

// Doc: NOTE: This function is for client-side use only and should not be called from Node.js backend
// Doc: Helper function to get authorization header from localStorage (for client-side use).
// Doc: Args: None
// Doc: Returns: object - Authorization header object with Bearer token or empty object
export const getAuthHeader = () => {
    // This only works in browser environment, not Node.js
    if (typeof window !== 'undefined' && window.localStorage) {
        const token = localStorage.getItem('token');
        if(token) {
            return {
                Authorization: `Bearer ${token}`
            };
        }
    }
    return {};
};

// Doc: Express middleware that protects routes by verifying JWT token from Authorization header.
// Doc: Args: req (AuthRequest) - Express request with user property, res (Response) - Express response, next (NextFunction) - Next middleware function
// Doc: Returns: void - Calls next() on success or returns 401/500 error response
export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    logger.debug('TokenManager.protect() -> authHeader: ', {authHeader: authHeader});
    const token = authHeader?.split(' ')[1] || undefined; // Bearer <token>

    if(!token) {
        logger.error('TokenManager.protect() -> Not authorized or no token present.');
        return res.status(401).json({Error: `Not Authorized or no token present`});
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as UserTokenPayload;
        logger.debug('TokenManager.verifyToken() -> token verified!');
        req.user = decoded;
        next();
    } catch(error) {
        logger.error('TokenManager.verifyToken() -> Token failed verification');
        res.status(500).json({Error: `Token Failed`});
    }
};
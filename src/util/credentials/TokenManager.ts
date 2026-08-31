// Doc: JWT token management utilities for authentication and route protection.
// Doc: Includes functions for generating, verifying tokens, and protecting routes with middleware.
import jwt from 'jsonwebtoken';
import logger from '../logger/LoggerImpl';
import { NextFunction, Request, Response } from 'express';
import { UserTokenPayload } from '../../types/Interfaces';
import { AuthRequest } from '../../types/CustomRequests';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? null;


// Doc: Secret key for JWT signing — must be set via JWT_SECRET env var.
//      Throws at startup in production if missing so misconfigured deploys fail fast.
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET env var must be set in production');
}
const SECRET_KEY = rawSecret ?? 'testing';

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

// Doc: Express middleware that protects admin routes using a static API key from the ADMIN_API_KEY env var.
// Doc: Usage: Authorization: Bearer <ADMIN_API_KEY>  (never expires — rotate by changing the env var)
export const protectAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!ADMIN_API_KEY) {
        logger.error('TokenManager.protectAdmin() -> ADMIN_API_KEY env var is not set');
        return res.status(500).json({ Error: 'Admin key not configured on server' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] ?? undefined;

    if (!token) {
        logger.error('TokenManager.protectAdmin() -> No token present');
        return res.status(401).json({ Error: 'Not authorized or no token present' });
    }

    if (token !== ADMIN_API_KEY) {
        logger.error('TokenManager.protectAdmin() -> Invalid admin key');
        return res.status(401).json({ Error: 'Invalid admin key' });
    }

    logger.debug('TokenManager.protectAdmin() -> admin key verified');
    next();
};

// Doc: Express middleware that protects routes by verifying JWT token from Authorization header.
// Doc: Args: req (AuthRequest) - Express request with user property, res (Response) - Express response, next (NextFunction) - Next middleware function
// Doc: Returns: void - Calls next() on success or returns 401/500 error response
export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    logger.debug('TokenManager.protect() -> authHeader: ', {authHeader: authHeader});
    const token = authHeader?.split(' ')[1] || undefined; // Bearer <token>

    if(!token) {
        logger.error('TokenManager.protect() -> Not authorized or no token present.', {method: req.method, path: req.originalUrl, ip: req.ip});
        return res.status(401).json({Error: `Not Authorized or no token present`});
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as UserTokenPayload;
        logger.debug('TokenManager.verifyToken() -> token verified!');
        req.user = decoded;
        next();
    } catch(error) {
        logger.error('TokenManager.verifyToken() -> Token failed verification', {method: req.method, path: req.originalUrl, ip: req.ip});
        res.status(401).json({Error: `Token Failed`});
    }
};
import jwt from 'jsonwebtoken';
import logger from './LoggerImpl';
import { NextFunction, Request, Response } from 'express';
import { AuthRequest, UserTokenPayload } from '../types/Interfaces';


const SECRET_KEY = 'testing'; //put this in a .env

// returns the token after being signed //
export const generateToken = (user: UserTokenPayload): string => {
    logger.debug('TokenManager.generateToken() -> generating userToken for: ', {user});
    return jwt.sign(user, SECRET_KEY, {expiresIn: '1h'});
};

export const verifyToken = (token: string) => {
    try {
        const decoded = jwt.verify(token, SECRET_KEY) as UserTokenPayload;
        logger.debug('TokenManager.verifyToken() -> verifying ', {userId: decoded.id});
        return decoded;
    } catch(error) {
        logger.error('TokenManager.verifyToken() -> error verifying/invalid token', {token: token});
        return null;
    }
};

// helpder to get authHeader //
export const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    if(token) {
        return {
            Authorization: `Bearer ${token}`
        };
    }
    return {};
};

// protects routes //
export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    const token = authHeader?.split(' ')[1] || undefined; // Bearer <token>

    if(!token) {
        logger.error('TokenManager.protect() -> Not authorized or no token present.');
        return res.status(401).json({Error: `Not Authorized or no token present`});
    }

    try {
        const decoded = jwt.verify(token, "process.env.JWT_SECRET") as UserTokenPayload;
        logger.debug('TokenManager.verifyToken() -> token verified!');
        req.user = decoded;
        next();
    } catch(error) {
        logger.error('TokenManager.verifyToken() -> Token failed verification');
        res.status(500).json({Error: `Token Failed`});
    }
};
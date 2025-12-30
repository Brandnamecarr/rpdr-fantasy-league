import jwt from 'jsonwebtoken';
import logger from './LoggerImpl';
import { Request, Response } from 'express';

interface UserPayload {
    userId: number;
    role: 'admin' | 'user';
}

const SECRET_KEY = 'your-super-secret-key'; //put this in a .env

export const generateToken = (user: UserPayload): string => {
    logger.debug('TokenManager.generateToken() -> generating userToken for: ', {user});
    return jwt.sign(user, SECRET_KEY, {expiresIn: '1h'});
};

export const verifyToken = (token: string) => {
    try {
        const decoded = jwt.verify(token, SECRET_KEY) as UserPayload;
        logger.debug('TokenManager.verifyToken() -> verifying ', {userId: decoded.userId});
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
export const protect = (req: Request, res: Response, next: any) => {
    const token = req.headers.Authorization?.split(' ')[1]; // Bearer <token>
    if(!token) {
        logger.error('TokenManager.protect() -> Not authorized or no token present.');
        return res.status(401).json({Error: `Not Authorized or no token present`});
    }
    try {
        const decoded = jwt.verify(token, "process.env.JWT_SECRET");
        logger.debug('TokenManager.verifyToken() -> token verified!');
        req.userId = decoded;
        next();
    } catch(error) {
        logger.error('TokenManager.verifyToken() -> Token failed verification');
        res.status(500).json({Error: `Token Failed`});
    }
};
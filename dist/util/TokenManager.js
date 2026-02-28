"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = exports.getAuthHeader = exports.verifyToken = exports.generateToken = void 0;
// Doc: JWT token management utilities for authentication and route protection.
// Doc: Includes functions for generating, verifying tokens, and protecting routes with middleware.
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const LoggerImpl_1 = __importDefault(require("./LoggerImpl"));
// Doc: Secret key for JWT signing — must be set via JWT_SECRET env var in production.
//      Falls back to 'testing' only for local development; Fargate will always inject this.
const SECRET_KEY = process.env.JWT_SECRET ?? 'testing';
// Doc: Generates a JWT token for a user with 1 hour expiration.
// Doc: Args: user (UserTokenPayload) - User payload containing id and email
// Doc: Returns: string - Signed JWT token
const generateToken = (user) => {
    LoggerImpl_1.default.debug('TokenManager.generateToken() -> generating userToken for: ', { user });
    return jsonwebtoken_1.default.sign(user, SECRET_KEY, { expiresIn: '1h' });
};
exports.generateToken = generateToken;
// Doc: Verifies a JWT token and returns the decoded payload.
// Doc: Args: token (string) - The JWT token to verify
// Doc: Returns: UserTokenPayload | null - Decoded user payload or null if verification fails
const verifyToken = (token) => {
    LoggerImpl_1.default.debug(`TokenManager.verifyToken() -> token: ${token}`);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, SECRET_KEY);
        LoggerImpl_1.default.debug('TokenManager.verifyToken() -> verifying ', { userId: decoded.id });
        return decoded;
    }
    catch (error) {
        LoggerImpl_1.default.error('TokenManager.verifyToken() -> error verifying/invalid token', { token: token });
        return null;
    }
};
exports.verifyToken = verifyToken;
// Doc: NOTE: This function is for client-side use only and should not be called from Node.js backend
// Doc: Helper function to get authorization header from localStorage (for client-side use).
// Doc: Args: None
// Doc: Returns: object - Authorization header object with Bearer token or empty object
const getAuthHeader = () => {
    // This only works in browser environment, not Node.js
    if (typeof window !== 'undefined' && window.localStorage) {
        const token = localStorage.getItem('token');
        if (token) {
            return {
                Authorization: `Bearer ${token}`
            };
        }
    }
    return {};
};
exports.getAuthHeader = getAuthHeader;
// Doc: Express middleware that protects routes by verifying JWT token from Authorization header.
// Doc: Args: req (AuthRequest) - Express request with user property, res (Response) - Express response, next (NextFunction) - Next middleware function
// Doc: Returns: void - Calls next() on success or returns 401/500 error response
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    LoggerImpl_1.default.debug('TokenManager.protect() -> authHeader: ', { authHeader: authHeader });
    const token = authHeader?.split(' ')[1] || undefined; // Bearer <token>
    if (!token) {
        LoggerImpl_1.default.error('TokenManager.protect() -> Not authorized or no token present.');
        return res.status(401).json({ Error: `Not Authorized or no token present` });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, SECRET_KEY);
        LoggerImpl_1.default.debug('TokenManager.verifyToken() -> token verified!');
        req.user = decoded;
        next();
    }
    catch (error) {
        LoggerImpl_1.default.error('TokenManager.verifyToken() -> Token failed verification');
        res.status(401).json({ Error: `Token Failed` });
    }
};
exports.protect = protect;

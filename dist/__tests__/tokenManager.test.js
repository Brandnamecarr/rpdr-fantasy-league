"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../util/LoggerImpl', () => ({
    __esModule: true,
    default: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));
const TokenManager_1 = require("../util/TokenManager");
const testUser = { id: 1, email: 'queen@werk.com' };
describe('TokenManager', () => {
    describe('generateToken', () => {
        it('returns a non-empty JWT string', () => {
            const token = (0, TokenManager_1.generateToken)(testUser);
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // header.payload.signature
        });
    });
    describe('verifyToken', () => {
        it('returns the payload for a valid token', () => {
            const token = (0, TokenManager_1.generateToken)(testUser);
            const decoded = (0, TokenManager_1.verifyToken)(token);
            expect(decoded).not.toBeNull();
            expect(decoded.id).toBe(testUser.id);
            expect(decoded.email).toBe(testUser.email);
        });
        it('returns null for a tampered token', () => {
            const result = (0, TokenManager_1.verifyToken)('totally.not.valid');
            expect(result).toBeNull();
        });
        it('returns null for an empty string', () => {
            const result = (0, TokenManager_1.verifyToken)('');
            expect(result).toBeNull();
        });
    });
    describe('protect middleware', () => {
        const makeReq = (authHeader) => ({ headers: { authorization: authHeader } });
        const makeRes = () => {
            const res = {};
            res.status = jest.fn().mockReturnValue(res);
            res.json = jest.fn().mockReturnValue(res);
            return res;
        };
        const next = jest.fn();
        beforeEach(() => {
            next.mockClear();
        });
        it('calls next() and attaches user when token is valid', () => {
            const token = (0, TokenManager_1.generateToken)(testUser);
            const req = makeReq(`Bearer ${token}`);
            const res = makeRes();
            (0, TokenManager_1.protect)(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
            expect(req.user).toBeDefined();
            expect(req.user.email).toBe(testUser.email);
        });
        it('returns 401 when no Authorization header is present', () => {
            const req = makeReq(undefined);
            const res = makeRes();
            (0, TokenManager_1.protect)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
        it('returns 401 when Authorization header has no token part', () => {
            const req = makeReq('Bearer ');
            const res = makeRes();
            (0, TokenManager_1.protect)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
        it('returns 401 when the token is invalid/tampered', () => {
            const req = makeReq('Bearer bad.token.here');
            const res = makeRes();
            (0, TokenManager_1.protect)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
    });
});

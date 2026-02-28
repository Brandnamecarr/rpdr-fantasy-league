"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../util/LoggerImpl', () => ({
    __esModule: true,
    default: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));
const PasswordManager_1 = require("../util/PasswordManager");
describe('PasswordManager', () => {
    describe('hashPassword', () => {
        it('returns a bcrypt hash string', async () => {
            const hash = await (0, PasswordManager_1.hashPassword)('mySecret123');
            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
            expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt prefix
        });
        it('produces a different hash each call (salted)', async () => {
            const h1 = await (0, PasswordManager_1.hashPassword)('samePassword');
            const h2 = await (0, PasswordManager_1.hashPassword)('samePassword');
            expect(h1).not.toEqual(h2);
        });
    });
    describe('comparePassword', () => {
        it('returns true when the plaintext matches the hash', async () => {
            const plaintext = 'correctHorseBatteryStaple';
            const hash = await (0, PasswordManager_1.hashPassword)(plaintext);
            const result = await (0, PasswordManager_1.comparePassword)(plaintext, hash);
            expect(result).toBe(true);
        });
        it('returns false when the plaintext does not match the hash', async () => {
            const hash = await (0, PasswordManager_1.hashPassword)('realPassword');
            const result = await (0, PasswordManager_1.comparePassword)('wrongPassword', hash);
            expect(result).toBe(false);
        });
        it('returns false when given an invalid hash', async () => {
            const result = await (0, PasswordManager_1.comparePassword)('anyPassword', 'not-a-valid-hash');
            expect(result).toBe(false);
        });
    });
});

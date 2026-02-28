"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
// Doc: Password hashing and comparison utilities using bcrypt for secure password storage.
const bcrypt = __importStar(require("bcrypt"));
const LoggerImpl_1 = __importDefault(require("./LoggerImpl"));
// Doc: Number of salt rounds for bcrypt (10 is a good balance of security and performance)
const SALT_ROUNDS = 10;
// Doc: Hashes a plaintext password using bcrypt with salt.
// Doc: Args: password (string) - The plaintext password to hash
// Doc: Returns: Promise<string> - The hashed password string
async function hashPassword(password) {
    try {
        // Generate the salt
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        // Hash the password using the generated salt
        const hash = await bcrypt.hash(password, salt);
        LoggerImpl_1.default.debug('PasswordManager.ts: successfully created hash');
        return hash;
    }
    catch (error) {
        LoggerImpl_1.default.error('PasswordManager.ts: failed to hash password');
        throw new Error('Failed to hash password');
    }
} // hashPassword //
// Doc: Compares a plaintext password against a stored bcrypt hash to verify credentials.
// Doc: Args: plaintextPassword (string) - The password provided by the user, hash (string) - The stored hash from the database
// Doc: Returns: Promise<boolean> - True if passwords match, false otherwise
async function comparePassword(plaintextPassword, hash) {
    try {
        const isMatch = await bcrypt.compare(plaintextPassword, hash);
        LoggerImpl_1.default.debug('PasswordManager.ts: passwords match');
        return isMatch;
    }
    catch (error) {
        LoggerImpl_1.default.error('PasswordManager.ts: error in comparePasswords');
        return false;
    }
}

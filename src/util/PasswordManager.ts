// Doc: Password hashing and comparison utilities using bcrypt for secure password storage.
import * as bcrypt from 'bcrypt';
import logger from './LoggerImpl';

// Doc: Number of salt rounds for bcrypt (10 is a good balance of security and performance)
const SALT_ROUNDS = 10;

// Doc: Hashes a plaintext password using bcrypt with salt.
// Doc: Args: password (string) - The plaintext password to hash
// Doc: Returns: Promise<string> - The hashed password string
export async function hashPassword(password: string): Promise<string> {
    try {
        // Generate the salt
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        
        // Hash the password using the generated salt
        const hash = await bcrypt.hash(password, salt);
        logger.debug('PasswordManager.ts: successfully created hash');
        return hash;
    } catch (error) {
        logger.error('PasswordManager.ts: failed to hash password');
        throw new Error('Failed to hash password');
    }
} // hashPassword //

// Doc: Compares a plaintext password against a stored bcrypt hash to verify credentials.
// Doc: Args: plaintextPassword (string) - The password provided by the user, hash (string) - The stored hash from the database
// Doc: Returns: Promise<boolean> - True if passwords match, false otherwise
export async function comparePassword(plaintextPassword: string, hash: string): Promise<boolean> {
    try {
        const isMatch = await bcrypt.compare(plaintextPassword, hash);
        logger.debug('PasswordManager.ts: passwords match');
        return isMatch;
    } catch (error) {
        logger.error('PasswordManager.ts: error in comparePasswords');
        return false;
    }
}
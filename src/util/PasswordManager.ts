import * as bcrypt from 'bcrypt';

// Set the number of salt rounds. Higher is more secure but slower.
// 10 is a good, common default for modern applications.
const SALT_ROUNDS = 10; 

/**
 * Hashes a plaintext password using Bcrypt.
 * @param password The plaintext password string.
 * @returns A Promise that resolves to the hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
    try {
        // Generate the salt
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        
        // Hash the password using the generated salt
        const hash = await bcrypt.hash(password, salt);
        
        return hash;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Failed to hash password.");
    }
} // hashPassword //

/**
 * Compares a plaintext password against a stored hash.
 * @param plaintextPassword The password provided by the user (e.g., during login).
 * @param hash The stored hash from the database.
 * @returns A Promise that resolves to a boolean indicating if the passwords match.
 */
export async function comparePassword(plaintextPassword: string, hash: string): Promise<boolean> {
    try {
        const isMatch = await bcrypt.compare(plaintextPassword, hash);
        return isMatch;
    } catch (error) {
        console.error("Error comparing password:", error);
        return false;
    }
}
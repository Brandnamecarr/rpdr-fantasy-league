"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.getUserRecord = exports.getUserByName = exports.createUser = exports.getAllEmails = exports.getUsers = void 0;
const prisma_client_1 = __importDefault(require("../db/prisma.client"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Queries the database for all user records.
// Doc: Args: None
// Doc: Returns: Promise<User[]> - Array of all user records
const getUsers = () => {
    LoggerImpl_1.default.debug('User.Service.ts: fetching all users from database');
    return prisma_client_1.default.user.findMany();
};
exports.getUsers = getUsers;
// Doc: Queries the database for all user email addresses.
// Doc: Args: None
// Doc: Returns: Promise<{email: string}[]> - Array of objects containing email addresses
const getAllEmails = () => {
    LoggerImpl_1.default.debug('User.Service.ts: fetching all usernames from db');
    return prisma_client_1.default.user.findMany({
        select: {
            email: true,
        },
    });
};
exports.getAllEmails = getAllEmails;
// Doc: Creates a new user record in the database with email and hashed password.
// Doc: Args: email (string) - User's email address, password (string) - User's hashed password
// Doc: Returns: Promise<User> - The created user record
const createUser = (email, password) => {
    LoggerImpl_1.default.debug('User.Service.ts: creating user: ', { email: email });
    return prisma_client_1.default.user.create({
        data: {
            email: email,
            password: password,
        }
    });
};
exports.createUser = createUser;
// Doc: Queries the database for a specific user by email address.
// Doc: Args: email (string) - The user's email address
// Doc: Returns: Promise<User | null> - The user record or null if not found
const getUserByName = async (email) => {
    LoggerImpl_1.default.debug('User.Service.ts: finding user in database: ', { email: email });
    return prisma_client_1.default.user.findUnique({
        where: {
            email: email,
        },
    });
};
exports.getUserByName = getUserByName;
// Doc: Loads a user's complete record including owned leagues, joined leagues, and rosters (deduplicated).
// Doc: Args: email (string) - The user's email address
// Doc: Returns: Promise<{userRecord: User, leagues: League[], rosters: Roster[]} | undefined> - Object containing user data, leagues, and rosters or undefined if user not found
const getUserRecord = async (email) => {
    LoggerImpl_1.default.debug('User.Service.ts: finding all user records in database: ', { email: email });
    let userRecord = await (0, exports.getUserByName)(email);
    if (!userRecord) {
        LoggerImpl_1.default.error('User.Service.ts: unable to find user in database: ', { email: email });
        return;
    }
    // Create the two primary league queries (Promises)
    const ownedLeaguesPromise = prisma_client_1.default.league.findMany({
        where: {
            owner: userRecord.email,
        },
    });
    const joinedLeaguesPromise = prisma_client_1.default.league.findMany({
        where: {
            users: {
                has: userRecord.email,
            },
        },
    });
    // Await both promises concurrently for optimal performance
    const [ownedLeaguesData, joinedLeaguesData] = await Promise.all([
        ownedLeaguesPromise,
        joinedLeaguesPromise
    ]);
    // --- Deduplication and Aggregation ---
    // Combine all league results. Note: A league can be both owned and joined.
    const allLeagues = [...ownedLeaguesData, ...joinedLeaguesData];
    // Use a Map to deduplicate leagues by their unique ID
    const leagueMap = new Map(); // Assuming 'League' has an 'id' field
    allLeagues.forEach(league => leagueMap.set(league.id, league));
    const uniqueLeagues = Array.from(leagueMap.values());
    // Extract the list of unique league names to use in the Roster filter
    const leagueNames = uniqueLeagues.map(league => league.leagueName);
    // --- Roster Lookup ---
    // Load Roster records associated with the user AND their unique leagues
    const userRosters = await prisma_client_1.default.roster.findMany({
        where: {
            username: userRecord.email, // Filter by the specific user
            leagueName: {
                in: leagueNames, // Filter by the aggregated list of leagues
            },
        },
    });
    // --- Return Combined Data ---
    let collectedData = {
        userRecord,
        leagues: uniqueLeagues,
        rosters: userRosters
    };
    return collectedData;
};
exports.getUserRecord = getUserRecord;
// Doc: Updates a user's password in the database with a new hashed password.
// Doc: Args: email (string) - The user's email address, newHashedPassword (string) - The new hashed password
// Doc: Returns: Promise<User> - The updated user record
const updatePassword = async (email, newHashedPassword) => {
    LoggerImpl_1.default.debug("User.Service.ts: Updating password with payload: ", { email: email });
    return await prisma_client_1.default.user.update({
        where: {
            email: email,
        },
        data: {
            password: newHashedPassword,
        },
    });
};
exports.updatePassword = updatePassword;

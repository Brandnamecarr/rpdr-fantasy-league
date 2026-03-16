import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";
import {League, User, Roster} from '@prisma/client';

// Doc: Queries the database for all user records.
// Doc: Args: None
// Doc: Returns: Promise<User[]> - Array of all user records
export const getUsers = () => {
    logger.debug('User.Service.ts: fetching all users from database');
    return prisma.user.findMany();  
};

// Doc: Queries the database for all user email addresses.
// Doc: Args: None
// Doc: Returns: Promise<{email: string}[]> - Array of objects containing email addresses
export const getAllEmails = () => {
    logger.debug('User.Service.ts: fetching all usernames from db');
    return prisma.user.findMany({
        select: {
            email: true,
        },
    });
};

// Doc: Creates a new user record in the database with email and hashed password.
// Doc: Args: email (string) - User's email address, password (string) - User's hashed password
// Doc: Returns: Promise<User> - The created user record
export const createUser = (email: string, password: string, displayName?: string | null) => {
    logger.debug('User.Service.ts: creating user: ', {email: email});
    return prisma.user.create({
        data: {
            email: email,
            password: password,
            ...(displayName ? { displayName } : {}),
        }
    });
};

// Doc: Queries the database for a specific user by email address.
// Doc: Args: email (string) - The user's email address
// Doc: Returns: Promise<User | null> - The user record or null if not found
export const getUserByName = async (email: string) => {
    logger.debug('User.Service.ts: finding user in database: ', {email: email});
    return prisma.user.findUnique({
        where: {
            email: email,
        },
    });
};

// Doc: Loads a user's complete record including owned leagues, joined leagues, and rosters (deduplicated).
// Doc: Args: email (string) - The user's email address
// Doc: Returns: Promise<{userRecord: User, leagues: League[], rosters: Roster[]} | undefined> - Object containing user data, leagues, and rosters or undefined if user not found
export const getUserRecord = async (email: string) => {
    logger.debug('User.Service.ts: finding all user records in database: ', {email: email});
    let userRecord = await getUserByName(email);

    if(!userRecord) {
        logger.error('User.Service.ts: unable to find user in database: ', {email: email});
        return;
    }

 // Create the two primary league queries (Promises)
    const ownedLeaguesPromise = prisma.league.findMany({
        where: {
            owner: userRecord.email,
        },
    });

    const joinedLeaguesPromise = prisma.league.findMany({
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
    const leagueMap = new Map<number, League>(); // Assuming 'League' has an 'id' field
    allLeagues.forEach(league => leagueMap.set(league.id, league));
    const uniqueLeagues = Array.from(leagueMap.values());
    
    // Extract the list of unique league names to use in the Roster filter
    const leagueNames = uniqueLeagues.map(league => league.leagueName);
    
    // --- Roster Lookup ---

    // Load Roster records associated with the user AND their unique leagues
    const userRosters = await prisma.roster.findMany({
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

// Doc: Retrieves display names for a list of user emails.
// Doc: Args: emails (string[]) - Array of email addresses to look up
// Doc: Returns: Promise<{email: string, displayName: string | null}[]> - Array of email/displayName pairs
export const getDisplayNames = async (emails: string[]) => {
    logger.debug('User.Service.ts: getDisplayNames() - fetching display names', {count: emails.length});
    return prisma.user.findMany({
        where: { email: { in: emails } },
        select: { email: true, displayName: true },
    });
};

// Doc: Updates a user's display name in the database.
// Doc: Args: email (string) - The user's email address, displayName (string) - The new display name
// Doc: Returns: Promise<User> - The updated user record
export const updateDisplayName = async (email: string, displayName: string) => {
    logger.debug("User.Service.ts: Updating displayName for: ", {email});
    return prisma.user.update({
        where: { email },
        data: { displayName },
    });
};

// Doc: Updates a user's password in the database with a new hashed password.
// Doc: Args: email (string) - The user's email address, newHashedPassword (string) - The new hashed password
// Doc: Returns: Promise<User> - The updated user record
export const updatePassword = async (email: string, newHashedPassword: string) => {
    logger.debug("User.Service.ts: Updating password with payload: ", {email: email});
    return await prisma.user.update({
        where: {
            email: email,
        },
        data: {
            password: newHashedPassword,
        },
    });
};
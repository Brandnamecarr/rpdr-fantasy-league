import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";
import {League, User, Roster} from '@prisma/client';

// returns users // 
export const getUsers = () => {
    logger.debug('User.Service.ts: fetching all users from database');
    return prisma.user.findMany();  
};

export const getAllEmails = () => {
    logger.debug('User.Service.ts: fetching all usernames from db');
    return prisma.user.findMany({
        select: {
            email: true,
        },
    });
};

export const createUser = (email: string, password: string) => {
    logger.debug('User.Service.ts: creating user: ', {email: email});
    return prisma.user.create({
        data: { 
            email: email, 
            password: password, 
        }
    });
};

// gets the user record by name.
export const getUserByName = async (email: string) => {
    logger.debug('User.Service.ts: finding user in database: ', {email: email});
    return prisma.user.findUnique({
        where: {
            email: email,
        },
    });
};

// loads user entire record //
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
import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// Doc: Queries the database for a specific league by name, franchise, and season.
// Doc: Args: leaguename (string) - The league name, franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<League | null> - The league record or null if not found
export const getLeague = (leaguename: string, franchise: string, season: number) => {
    logger.debug('League.Service.ts: getting league with leaguename: ', {leagueName: leaguename, franchise: franchise, season: season});
    return prisma.league.findUnique({
        where: {
            leagueName: leaguename,
            franchise: franchise,
            season: season,
        },
    });  
};

// Doc: Helper function that creates a new roster record in the database.
// Doc: Args: leagueName (string) - League name, franchise (string) - Franchise name, season (number) - Season number, teamName (string) - Team name, email (string) - User email, queens (string[]) - Array of queen names
// Doc: Returns: Promise<Roster> - The created roster record
const makeNewRoster = async (leagueName: string, franchise: string, season: number,
    teamName: string, email: string, queens: string[]
) => {
    logger.debug('League.Service.ts: makeNewRoster() - creating owner roster record', {leagueName, franchise, season, teamName, email, queensCount: queens.length});
    return await prisma.roster.create({
        data: {
            leagueName:leagueName,
            franchise: franchise,
            season: season,
            teamName: teamName,
            username: email,
            queens: queens,
            currentPoints: 0
        },
    });
};

// Doc: Queries the database for all league records.
// Doc: Args: None
// Doc: Returns: Promise<League[]> - Array of all league records
export const getAllLeagues = () => {
    logger.debug('League.Service.ts: loading all league records');
    return prisma.league.findMany();
};

// Doc: Creates a new league in the database and creates a roster for the owner.
// Doc: Args: leaguename (string) - League name, owner (string) - Owner email, users (Array<string>) - Array of user emails, maxPlayers (number) - Max players allowed, maxQueensPerTeam (number) - Max queens per team, franchise (string) - Franchise name, season (number) - Season number, teamName (string) - Owner's team name, queens (string[]) - Owner's selected queens
// Doc: Returns: Promise<League | null> - The created league record or null on failure
export const createLeague = async (leaguename: string, owner: string, users: Array<string>, maxPlayers: number, maxQueensPerTeam: number, franchise: string, season: number, teamName: string, queens: string[]) => {
    logger.debug('League.Service.ts: creatingLeague with name: ', {leaguename: leaguename, owner: owner, users: users, maxPlayers:maxPlayers, maxQueensPerTeam:maxQueensPerTeam});

    const newLeague = await prisma.league.create({
        data: {
            leagueName: leaguename,
            owner: owner,
            users: users,
            maxPlayers: maxPlayers,
            maxQueensPerTeam: maxQueensPerTeam,
            franchise: franchise,
            season: season,
        },
    });

    if(!newLeague) {
        logger.error('League.Service.ts: createLeague failed to make new league', {leaguename: leaguename});
        return null;
    }

    const newRoster = await makeNewRoster(leaguename, franchise, season, teamName, owner, queens);
    if(!newRoster) {
        logger.error('League.Service.ts: createLeague failed to make roster for ', {leaguename: leaguename, email: owner});
        return null;
    }

    logger.info('League.Service.ts: createLeague() - league and owner roster created successfully', {leaguename, owner, franchise, season});
    return newLeague;
};

// Doc: Queries the database for all leagues where the user is a member.
// Doc: Args: email (string) - The user's email address
// Doc: Returns: Promise<League[]> - Array of leagues the user is part of (returns id, leagueName, franchise, season)
export const getLeaguesByUser = (email: string) => {
    logger.debug('League.Service.ts: getLeaguesByUser() - fetching leagues for user', {email});
    return prisma.league.findMany({
        where: {
            users: {
                has: email,
            },
        },
        select: {
            id: true,
            leagueName: true,
            franchise: true,
            season: true,
        },
    });
};

// Doc: Queries all leagues and filters for those with available spots (users.length < maxPlayers).
// Doc: Args: None
// Doc: Returns: Promise<League[]> - Array of leagues that can accept more players
export const getAvailableLeagues = async () => {
    logger.debug('League.Service.ts: about to get all leagues', {});

    const allLeagues = await prisma.league.findMany({
        select: {
            id: true,
            owner: true,
            leagueName: true,
            users: true,
            maxPlayers: true,
            franchise: true,
            season: true,
        },
    });

    const availableLeagues = allLeagues.filter(league => {
        return league.users.length < league.maxPlayers;
    });

    logger.debug('League.Service.ts: getAvailableLeagues() - filtered available leagues', {total: allLeagues.length, available: availableLeagues.length});
    return availableLeagues;
};

// Doc: Queries all leagues a user is in, then cross-references with INACTIVE ActiveSeasons to return only past leagues.
// Doc: Args: email (string) - The user's email address
// Doc: Returns: Promise<League[]> - Array of the user's leagues whose franchise/season is marked INACTIVE
export const getInactiveLeaguesByUser = async (email: string) => {
    logger.debug('League.Service.ts: getInactiveLeaguesByUser() - fetching inactive leagues for user', {email});

    const userLeagues = await prisma.league.findMany({
        where: { users: { has: email } },
    });

    const inactiveSeasons = await prisma.activeSeasons.findMany({
        where: { activityStatus: 'INACTIVE' },
    });

    const inactiveSet = new Set(inactiveSeasons.map(s => `${s.franchise}:${s.season}`));
    return userLeagues.filter(l => inactiveSet.has(`${l.franchise}:${l.season}`));
};

// Doc: Queries leagues by franchise and season, then filters for those with available spots.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<League[]> - Array of available leagues matching franchise and season
export const getAvailByFranAndSeason = async (franchise: string, season: number) => {
    logger.debug('League.Service.ts: getAvailByFranAndSeason() - fetching available leagues', {franchise, season});
    const allLeagues = await prisma.league.findMany({
        where: {
            franchise: franchise,
            season: season,
        },
    }); // load all leagues in franchise and season //

    const availableLeagues = allLeagues.filter(league => {
        return league.users.length < league.maxPlayers;
    });

    logger.debug('League.Service.ts: getAvailByFranAndSeason() - filtered results', {franchise, season, total: allLeagues.length, available: availableLeagues.length});
    return availableLeagues;
};
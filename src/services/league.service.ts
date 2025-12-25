import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// returns specific league by name // 
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

// returns records of all the leagues // 
export const getAllLeagues = () => {
    logger.debug('League.Service.ts: loading all league records');
    return prisma.league.findMany();
};

// creates a league in the database // 
export const createLeague = (leaguename: string, owner: string, users: Array<string>, maxPlayers: number, maxQueensPerTeam: number, franchise: string, season: number) => {
    // TODO: make sure league name is unique //
    logger.debug('League.Service.ts: creatingLeague with name: ', {leaguename: leaguename, owner: owner, users: users, maxPlayers:maxPlayers, maxQueensPerTeam:maxQueensPerTeam});
    return prisma.league.create({
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
};

export const getLeaguesByUser = (email: string) => {
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

// gets all leagues where length(users) < maxPlayers //
// AKA: what leagues can take on more players //
export const getAvailableLeagues = async () => {
    logger.debug('League.Service.ts: about to get all leagues', {});

    const allLeagues = await prisma.league.findMany({
        select: {
            id: true,
            owner: true,
            leagueName: true,
            users: true,
            maxPlayers: true,
        },
    });

    const availableLeagues = allLeagues.filter(league => {
        return league.users.length < league.maxPlayers;
    });
    
    return availableLeagues;
};

export const getAvailByFranAndSeason = async (franchise: string, season: number) => {
    const allLeagues = await prisma.league.findMany({
        where: {
            franchise: franchise,
            season: season,
        },
    }); // load all leagues in franchise and season //

    const availableLeagues = allLeagues.filter(league => {
        return league.users.length < league.maxPlayers;
    });

    return availableLeagues;
};
import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// returns specific league by name // 
export const getLeague = (leaguename: string) => {
    logger.debug('League.Service.ts: getting league with leaguename: ', {leagueName: leaguename});
    return prisma.league.findUnique({
        where: {
            leagueName: leaguename,
        },
    });  
};

// returns records of all the leagues // 
export const getAllLeagues = () => {
    logger.debug('League.Service.ts: loading all league records');
    return prisma.league.findMany();
};

// creates a league in the database // 
export const createLeague = (leaguename: string, owner: string, users: Array<string>, maxPlayers: number, maxQueensPerTeam: number) => {
    // TODO: make sure league name is unique //
    logger.debug('League.Service.ts: creatingLeague with name: ', {leaguename: leaguename, owner: owner, users: users, maxPlayers:maxPlayers, maxQueensPerTeam:maxQueensPerTeam});
    return prisma.league.create({
        data: {
            leagueName: leaguename,
            owner: owner,
            users: users,
            maxPlayers: maxPlayers,
            maxQueensPerTeam: maxQueensPerTeam,
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

    console.log(`Got allLeagues: ${allLeagues}`);

    const availableLeagues = allLeagues.filter(league => {
        return league.users.length < league.maxPlayers;
    });
    console.log(
        "available leagues below:"
    );
    console.log(availableLeagues);
    return availableLeagues;
};
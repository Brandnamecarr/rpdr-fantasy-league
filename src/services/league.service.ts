import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// returns specific league by name // 
export const getLeague = (leaguename: string) => {
    logger.info('League.Service.ts: getting league with leaguename: ', {leagueName: leaguename});
    return prisma.league.findUnique({
        where: {
            leagueName: leaguename,
        },
    });  
};

// returns records of all the leagues // 
export const getAllLeagues = () => {
    logger.info('League.Service.ts: loading all league records');
    return prisma.league.findMany();
};

// creates a league in the database // 
export const createLeague = (leaguename: string, owner: string, users: Array<string>, maxPlayers: number) => {
    // TODO: make sure league name is unique //
    logger.info('League.Service.ts: creatingLeague with name: ', {leaguename: leaguename, owner: owner, users: users, maxPlayers:maxPlayers});
    return prisma.league.create({
        data: {
            leagueName: leaguename,
            owner: owner,
            users: users,
            maxPlayers: maxPlayers
        },
    });
};
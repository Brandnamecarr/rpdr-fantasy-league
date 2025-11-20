import prisma from "../db/prisma.client";

// returns specific league by name // 
export const getLeague = (leaguename: string) => {
    return prisma.league.findUnique({
        where: {
            leaguename,
        },
    });  
};

// returns records of all the leagues // 
export const getAllLeagues = () => {
    return prisma.league.findMany();
};

// creates a league in the database // 
export const createLeague = (datapoints: any) => {
    // TODO: make sure league name is unique //
    return prisma.league.create({
        where: {
            datapoints,
        },
    });
};

// add user to league // 
export const addUserToLeague = (username: string, leaguename: string) => {
    // load league data from db //
    // get number of users registered to the league and the max number //
    // add user if max users not yet reached //
};

// removes user from league // 
export const removeUserFromLeague = (username: string, leaguename: string) => {
    // load league data from db //
    // if user is in the users, remove //
};
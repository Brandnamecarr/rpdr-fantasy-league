import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// returns users // 
export const getUsers = () => {
    return prisma.user.findMany();  
};

export const createUser = (name: string, email: string, password: string, teamName: string, queens: string[]) => {
    logger.info('User.Service.ts: creating user: ', {email: email});
    // TODO Hash Password here ? before it goes to DB.
    return prisma.user.create({
        data: {
            username: name, 
            email, 
            password, 
            teamName, 
            queens
        }
    });
};

// gets the user record by name.
export const getUserByName = (username: string) => {
    logger.info('User.Service.ts: finding user in database: ', {username: username});
    return prisma.user.findUnique({
        where: {
            username,
        },
    });
};
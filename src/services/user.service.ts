import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// returns users // 
export const getUsers = () => {
    logger.info('User.Service.ts: fetching all users from database');
    return prisma.user.findMany();  
};

export const createUser = (email: string, password: string) => {
    logger.info('User.Service.ts: creating user: ', {email: email});
    return prisma.user.create({
        data: { 
            email: email, 
            password: password, 
        }
    });
};

// gets the user record by name.
export const getUserByName = (email: string) => {
    logger.info('User.Service.ts: finding user in database: ', {email: email});
    return prisma.user.findUnique({
        where: {
            email,
        },
    });
};
import prisma from "../db/prisma.client";

// returns users // 
export const getUsers = () => {
    return prisma.user.findMany();  
};

export const createUser = (name: string, email: string, password: string, teamName: string, queens: string[]) => {
    console.log(name);
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
    return prisma.user.findUnique({
        where: {
            username,
        },
    });
};
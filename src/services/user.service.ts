import prisma from "../db/prisma.client";

// returns users // 
export const getUsers = () => {
    return prisma.user.findMany();  
};

export const createUser = (name: string, email: string, password: string,) => {
    return prisma.user.create({
        data: {name, email}
    });
};
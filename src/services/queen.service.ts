import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

export const getAllQueens = () => {
    return prisma.queen.findMany();
};

export const getQueenByName = (name: string) => {
    return prisma.queen.findMany({
        where: {
            name: name,
        },
    });
};
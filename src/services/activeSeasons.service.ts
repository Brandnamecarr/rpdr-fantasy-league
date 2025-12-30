import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

import { ActivityStatus } from "@prisma/client";

export const getActiveSeasons = () => {
    return prisma.activeSeasons.findMany({
        where: {
            activityStatus: 'ACTIVE',
        },
    });
};

export const getAllSeasons = () => {
    return prisma.activeSeasons.findMany();
};

export const addSeason = (franchise: string, season: number) => {
    return prisma.activeSeasons.create({
        data: {
            franchise: franchise,
            season: season,
        },
    });
};

export const updateSeason = async (franchise: string, season: number, status: ActivityStatus) => {
    return await prisma.activeSeasons.update({
        where: {
            franchise_season: {
                franchise: franchise,
                season: season,
            },
        },
        data: {
            activityStatus: status,
        },
    });
};
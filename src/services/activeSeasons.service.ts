import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

import { ActivityStatus } from "@prisma/client";

// Doc: Queries the database for all active seasons (activityStatus = 'ACTIVE').
// Doc: Args: None
// Doc: Returns: Promise<ActiveSeasons[]> - Array of active season records
export const getActiveSeasons = () => {
    return prisma.activeSeasons.findMany({
        where: {
            activityStatus: 'ACTIVE',
        },
    });
};

// Doc: Queries the database for all season records regardless of activity status.
// Doc: Args: None
// Doc: Returns: Promise<ActiveSeasons[]> - Array of all season records
export const getAllSeasons = () => {
    return prisma.activeSeasons.findMany();
};

// Doc: Creates a new season record in the database.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<ActiveSeasons> - The created season record
export const addSeason = (franchise: string, season: number) => {
    return prisma.activeSeasons.create({
        data: {
            franchise: franchise,
            season: season,
        },
    });
};

// Doc: Updates the activity status of a season in the database.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number, status (ActivityStatus) - The new activity status
// Doc: Returns: Promise<ActiveSeasons> - The updated season record
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
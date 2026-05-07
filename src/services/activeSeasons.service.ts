import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

import { ActivityStatus, BracketName } from "@prisma/client";

// Doc: Queries the database for all active seasons (activityStatus = 'ACTIVE').
// Doc: Args: None
// Doc: Returns: Promise<ActiveSeasons[]> - Array of active season records
export const getActiveSeasons = () => {
    logger.debug('ActiveSeasons.Service.ts: getActiveSeasons() - fetching all ACTIVE seasons');
    return prisma.activeSeasons.findMany({
        where: {
            activityStatus: 'ACTIVE',
        },
    });
};

// Doc: Queries the database for all upcoming seasons (activityStatus = 'INACTIVE').
// Doc: Args: None
// Doc: Returns: Promise<ActiveSeasons[]> - Array of inactive/upcoming season records
export const getUpcomingSeasons = () => {
    logger.debug('ActiveSeasons.Service.ts: getUpcomingSeasons() - fetching all INACTIVE seasons');
    return prisma.activeSeasons.findMany({
        where: {
            activityStatus: 'INACTIVE',
        },
        orderBy: [{ franchise: 'asc' }, { season: 'asc' }],
    });
};

// Doc: Queries the database for all season records regardless of activity status.
// Doc: Args: None
// Doc: Returns: Promise<ActiveSeasons[]> - Array of all season records
export const getAllSeasons = () => {
    logger.debug('ActiveSeasons.Service.ts: getAllSeasons() - fetching all season records');
    return prisma.activeSeasons.findMany();
};

// Doc: Creates a new season record in the database.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<ActiveSeasons> - The created season record
export const addSeason = (franchise: string, season: number, isUsingBrackets?: boolean, bracketCount?: number) => {
    logger.info('ActiveSeasons.Service.ts: addSeason() - creating new season record', {franchise, season, isUsingBrackets, bracketCount});
    return prisma.activeSeasons.create({
        data: {
            franchise,
            season,
            ...(isUsingBrackets !== undefined && { isUsingBrackets }),
            ...(bracketCount !== undefined && { bracketCount }),
        },
    });
};

export const addBracket = (franchise: string, season: number, bracketName: BracketName, queens: string[]) => {
    logger.info('ActiveSeasons.Service.ts: addBracket() - creating bracket record', {franchise, season, bracketName, queensCount: queens.length});
    return prisma.bracket.create({
        data: { franchise, season, bracketName, queens },
    });
};

export const getBrackets = (franchise: string, season: number) => {
    logger.debug('ActiveSeasons.Service.ts: getBrackets() - fetching brackets', {franchise, season});
    return prisma.bracket.findMany({
        where: { franchise, season },
        orderBy: { bracketName: 'asc' },
    });
};

// Doc: Updates the activity status of a season in the database.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number, status (ActivityStatus) - The new activity status
// Doc: Returns: Promise<ActiveSeasons> - The updated season record
export const updateSeason = async (franchise: string, season: number, status: ActivityStatus) => {
    logger.info('ActiveSeasons.Service.ts: updateSeason() - updating season status', {franchise, season, newStatus: status});
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
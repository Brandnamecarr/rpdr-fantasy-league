import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";
import * as ENUMS from '../enums/enums';
import * as INTERFACES from '../types/Interfaces';
import { QueenStatus } from "@prisma/client";

// Doc: Queries the database for all queen records.
// Doc: Args: None
// Doc: Returns: Promise<Queen[]> - Array of all queen records
export const getAllQueens = () => {
    logger.debug('Queen.Service.ts: getAllQueens() - fetching all queen records');
    return prisma.queen.findMany();
};

// Doc: Queries the database for all queen records matching a specific name (across all franchises/seasons).
// Doc: Args: name (string) - The queen's name
// Doc: Returns: Promise<Queen[]> - Array of queen records with matching name
export const getQueenByName = (name: string) => {
    logger.debug('Queen.Service.ts: getQueenByName() - fetching queen records by name', {name});
    return prisma.queen.findMany({
        where: {
            name: name,
        },
    });
};

// Doc: Queries the database for all queens in a specific franchise and season.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<Queen[]> - Array of queen records matching franchise and season
export const getByFranchiseAndSeason = (franchise: string, season: number) => {
    logger.debug('Queen.Service.ts: getByFranchiseAndSeason() - fetching queens', {franchise, season});
    return prisma.queen.findMany({
        where: {
            franchise: franchise,
            season: season
        },
    });
};

// Doc: Queries the database for a specific queen's record including status.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number, name (string) - The queen's name
// Doc: Returns: Promise<Queen[]> - Array of queen records matching all criteria
export const getQueenStatus = (franchise: string, season: number, name: string) => {
    logger.debug('Queen.Service.ts: getQueenStatus() - fetching queen status', {franchise, season, name});
    return prisma.queen.findMany({
        where: {
            name: name,
            franchise: franchise,
            season: season
        },
    });
};

// Doc: Creates a new queen record in the database.
// Doc: Args: name (string) - The queen's name, franchise (string) - The franchise name, season (number) - The season number, location (string) - The queen's location/origin, status (QueenStatus) - The queen's status
// Doc: Returns: Promise<Queen> - The created queen record
export const addNewQueen = (name: string, franchise: string, season: number, location: string, status: QueenStatus) => {
    logger.debug('Queen.Service.ts: addNewQueen() - inserting new queen record', {name, franchise, season, location, status});
    return prisma.queen.create({
        data: {
            name: name,
            location: location,
            status: status,
            franchise: franchise,
            season: season,
        },
    });
};

// Doc: Creates multiple queen records in the database in bulk, skipping duplicates.
// Doc: Args: queenData (INTERFACES.QueenInput[]) - Array of queen data objects to insert
// Doc: Returns: Promise<BatchPayload> - Count of created records
export const addNewQueens = async (queenData: INTERFACES.QueenInput[]) => {
    logger.debug('Queen.Service.ts: addNewQueens() - bulk inserting queen records', {count: queenData.length});
    return prisma.queen.createMany({
        data: queenData,
        skipDuplicates: true,
    });
};

// Doc: Updates the status of queens matching the specified criteria.
// Doc: Args: name (string) - The queen's name, franchise (string) - The franchise name, season (number) - The season number, status (QueenStatus) - The new status
// Doc: Returns: Promise<BatchPayload> - Count of updated records
export const updateQueenStatus = async (name: string, franchise: string, season: number, status: QueenStatus) => {
    logger.info('Queen.Service.ts: updateQueenStatus() - updating status', {name, franchise, season, newStatus: status});
    // returns a count //
    return await prisma.queen.updateMany({
        where: {
            name: name,
            franchise: franchise,
            season: season,
        },
        data: {
            status: status,
        },
    });
};

// Doc: Queries the database for a queen's record to find their ID.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number, name (string) - The queen's name
// Doc: Returns: Promise<Queen[]> - Array of queen records matching all criteria
export const findQueenId = (franchise: string, season: number, name: string) => {
    logger.debug('Queen.Service.ts: findQueenId() - looking up queenId', {franchise, season, name});
    return prisma.queen.findMany({
        where: {
            name: name,
            franchise: franchise,
            season: season,
        },
    });
};
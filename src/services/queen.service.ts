import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";
import * as ENUMS from '../enums/enums';
import * as QueenStatusHelper from '../util/QueenStatusHelper';
import * as INTERFACES from '../types/Interfaces';
import { QueenStatus } from "@prisma/client";

// returns all queens in the table //
export const getAllQueens = () => {
    return prisma.queen.findMany();
};

// returns list of franchises/seasons a queen has participated in //
export const getQueenByName = (name: string) => {
    return prisma.queen.findMany({
        where: {
            name: name,
        },
    });
};

// gets queens by franchise/season //
export const getByFranchiseAndSeason = (franchise: string, season: number) => {
    return prisma.queen.findMany({
        where: {
            franchise: franchise,
            season: season
        },
    });
};

// returns specific queen record //
export const getQueenStatus = (franchise: string, season: number, name: string) => {
    return prisma.queen.findMany({
        where: {
            name: name,
            franchise: franchise,
            season: season
        },
    });
};

// adds queen to table //
export const addNewQueen = (name: string, franchise: string, season: number, location: string, status: QueenStatus) => {
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

// adds queen[] to table //
export const addNewQueens = async (queenData: INTERFACES.QueenInput[]) => {
    return prisma.queen.createMany({
        data: queenData,
        skipDuplicates: true,
    });
};

// update queens status //
export const updateQueenStatus = async (name: string, franchise: string, season: number, status: QueenStatus) => {
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

export const findQueenId = (franchise: string, season: number, name: string) => {
    return prisma.queen.findMany({
        where: {
            name: name,
            franchise: franchise,
            season: season,
        },
    });
};
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findQueenId = exports.updateQueenStatus = exports.addNewQueens = exports.addNewQueen = exports.getQueenStatus = exports.getByFranchiseAndSeason = exports.getQueenByName = exports.getAllQueens = void 0;
const prisma_client_1 = __importDefault(require("../db/prisma.client"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Queries the database for all queen records.
// Doc: Args: None
// Doc: Returns: Promise<Queen[]> - Array of all queen records
const getAllQueens = () => {
    LoggerImpl_1.default.debug('Queen.Service.ts: getAllQueens() - fetching all queen records');
    return prisma_client_1.default.queen.findMany();
};
exports.getAllQueens = getAllQueens;
// Doc: Queries the database for all queen records matching a specific name (across all franchises/seasons).
// Doc: Args: name (string) - The queen's name
// Doc: Returns: Promise<Queen[]> - Array of queen records with matching name
const getQueenByName = (name) => {
    LoggerImpl_1.default.debug('Queen.Service.ts: getQueenByName() - fetching queen records by name', { name });
    return prisma_client_1.default.queen.findMany({
        where: {
            name: name,
        },
    });
};
exports.getQueenByName = getQueenByName;
// Doc: Queries the database for all queens in a specific franchise and season.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<Queen[]> - Array of queen records matching franchise and season
const getByFranchiseAndSeason = (franchise, season) => {
    LoggerImpl_1.default.debug('Queen.Service.ts: getByFranchiseAndSeason() - fetching queens', { franchise, season });
    return prisma_client_1.default.queen.findMany({
        where: {
            franchise: franchise,
            season: season
        },
    });
};
exports.getByFranchiseAndSeason = getByFranchiseAndSeason;
// Doc: Queries the database for a specific queen's record including status.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number, name (string) - The queen's name
// Doc: Returns: Promise<Queen[]> - Array of queen records matching all criteria
const getQueenStatus = (franchise, season, name) => {
    LoggerImpl_1.default.debug('Queen.Service.ts: getQueenStatus() - fetching queen status', { franchise, season, name });
    return prisma_client_1.default.queen.findMany({
        where: {
            name: name,
            franchise: franchise,
            season: season
        },
    });
};
exports.getQueenStatus = getQueenStatus;
// Doc: Creates a new queen record in the database.
// Doc: Args: name (string) - The queen's name, franchise (string) - The franchise name, season (number) - The season number, location (string) - The queen's location/origin, status (QueenStatus) - The queen's status
// Doc: Returns: Promise<Queen> - The created queen record
const addNewQueen = (name, franchise, season, location, status) => {
    LoggerImpl_1.default.debug('Queen.Service.ts: addNewQueen() - inserting new queen record', { name, franchise, season, location, status });
    return prisma_client_1.default.queen.create({
        data: {
            name: name,
            location: location,
            status: status,
            franchise: franchise,
            season: season,
        },
    });
};
exports.addNewQueen = addNewQueen;
// Doc: Creates multiple queen records in the database in bulk, skipping duplicates.
// Doc: Args: queenData (INTERFACES.QueenInput[]) - Array of queen data objects to insert
// Doc: Returns: Promise<BatchPayload> - Count of created records
const addNewQueens = async (queenData) => {
    LoggerImpl_1.default.debug('Queen.Service.ts: addNewQueens() - bulk inserting queen records', { count: queenData.length });
    return prisma_client_1.default.queen.createMany({
        data: queenData,
        skipDuplicates: true,
    });
};
exports.addNewQueens = addNewQueens;
// Doc: Updates the status of queens matching the specified criteria.
// Doc: Args: name (string) - The queen's name, franchise (string) - The franchise name, season (number) - The season number, status (QueenStatus) - The new status
// Doc: Returns: Promise<BatchPayload> - Count of updated records
const updateQueenStatus = async (name, franchise, season, status) => {
    LoggerImpl_1.default.info('Queen.Service.ts: updateQueenStatus() - updating status', { name, franchise, season, newStatus: status });
    // returns a count //
    return await prisma_client_1.default.queen.updateMany({
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
exports.updateQueenStatus = updateQueenStatus;
// Doc: Queries the database for a queen's record to find their ID.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number, name (string) - The queen's name
// Doc: Returns: Promise<Queen[]> - Array of queen records matching all criteria
const findQueenId = (franchise, season, name) => {
    LoggerImpl_1.default.debug('Queen.Service.ts: findQueenId() - looking up queenId', { franchise, season, name });
    return prisma_client_1.default.queen.findMany({
        where: {
            name: name,
            franchise: franchise,
            season: season,
        },
    });
};
exports.findQueenId = findQueenId;

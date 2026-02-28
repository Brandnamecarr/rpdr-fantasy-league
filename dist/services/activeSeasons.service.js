"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSeason = exports.addSeason = exports.getAllSeasons = exports.getActiveSeasons = void 0;
const prisma_client_1 = __importDefault(require("../db/prisma.client"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Queries the database for all active seasons (activityStatus = 'ACTIVE').
// Doc: Args: None
// Doc: Returns: Promise<ActiveSeasons[]> - Array of active season records
const getActiveSeasons = () => {
    LoggerImpl_1.default.debug('ActiveSeasons.Service.ts: getActiveSeasons() - fetching all ACTIVE seasons');
    return prisma_client_1.default.activeSeasons.findMany({
        where: {
            activityStatus: 'ACTIVE',
        },
    });
};
exports.getActiveSeasons = getActiveSeasons;
// Doc: Queries the database for all season records regardless of activity status.
// Doc: Args: None
// Doc: Returns: Promise<ActiveSeasons[]> - Array of all season records
const getAllSeasons = () => {
    LoggerImpl_1.default.debug('ActiveSeasons.Service.ts: getAllSeasons() - fetching all season records');
    return prisma_client_1.default.activeSeasons.findMany();
};
exports.getAllSeasons = getAllSeasons;
// Doc: Creates a new season record in the database.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<ActiveSeasons> - The created season record
const addSeason = (franchise, season) => {
    LoggerImpl_1.default.info('ActiveSeasons.Service.ts: addSeason() - creating new season record', { franchise, season });
    return prisma_client_1.default.activeSeasons.create({
        data: {
            franchise: franchise,
            season: season,
        },
    });
};
exports.addSeason = addSeason;
// Doc: Updates the activity status of a season in the database.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number, status (ActivityStatus) - The new activity status
// Doc: Returns: Promise<ActiveSeasons> - The updated season record
const updateSeason = async (franchise, season, status) => {
    LoggerImpl_1.default.info('ActiveSeasons.Service.ts: updateSeason() - updating season status', { franchise, season, newStatus: status });
    return await prisma_client_1.default.activeSeasons.update({
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
exports.updateSeason = updateSeason;

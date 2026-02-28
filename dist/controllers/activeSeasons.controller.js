"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSeason = exports.addSeason = exports.getAllSeasons = exports.getActiveSeasons = void 0;
const seasonService = __importStar(require("../services/activeSeasons.service"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Retrieves all seasons with active status from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /active-seasons or GET /seasons/active
const getActiveSeasons = async (req, res) => {
    LoggerImpl_1.default.info('ActiveSeasons.Controller: getActiveSeasons() - Request received to fetch all active seasons');
    try {
        let response = await seasonService.getActiveSeasons();
        if (!response || response.length === 0) {
            LoggerImpl_1.default.info('ActiveSeasons.Controller: getActiveSeasons() - No active seasons found in database');
            return res.status(404).json({ Error: 'Unable to find any active seasons' });
        }
        LoggerImpl_1.default.info('ActiveSeasons.Controller: getActiveSeasons() - Successfully retrieved active seasons', { count: response.length });
        res.status(200).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('ActiveSeasons.Controller: getActiveSeasons() - Error retrieving active seasons', { error: error });
        res.status(500).json({ Error: 'Server error when loading Active Seasons' });
    }
};
exports.getActiveSeasons = getActiveSeasons;
// Doc: Retrieves all seasons from the database regardless of status.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /seasons
const getAllSeasons = async (req, res) => {
    LoggerImpl_1.default.info('ActiveSeasons.Controller: getAllSeasons() - Request received to fetch all seasons');
    try {
        let response = await seasonService.getAllSeasons();
        if (!response || response.length === 0) {
            LoggerImpl_1.default.info('ActiveSeasons.Controller: getAllSeasons() - No seasons found in database');
            return res.status(404).json({ Error: 'Unable to find any seasons' });
        }
        LoggerImpl_1.default.info('ActiveSeasons.Controller: getAllSeasons() - Successfully retrieved all seasons', { count: response.length });
        res.status(200).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('ActiveSeasons.Controller: getAllSeasons() - Error retrieving all seasons', { error: error });
        res.status(500).json({ Error: 'Server error when locating all seasons' });
    }
};
exports.getAllSeasons = getAllSeasons;
// Doc: Adds a new season record to the database.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /seasons
const addSeason = async (req, res) => {
    const { franchise, season } = req.body;
    LoggerImpl_1.default.info('ActiveSeasons.Controller: addSeason() - Request received to add new season', { franchise, season });
    let seasonAsInt = Number(season) || 0;
    if (seasonAsInt === 0 || !franchise || franchise === '') {
        LoggerImpl_1.default.error('ActiveSeasons.Controller: addSeason() - Invalid parameters provided', { franchise, season, seasonAsInt });
        return res.status(400).json({ Error: `Franchise and Season must be valid parameters` });
    }
    try {
        LoggerImpl_1.default.debug('ActiveSeasons.Controller: addSeason() - Calling service to add season', { franchise, seasonAsInt });
        let response = await seasonService.addSeason(franchise, seasonAsInt);
        if (!response) {
            LoggerImpl_1.default.error('ActiveSeasons.Controller: addSeason() - Service returned null response', { franchise, seasonAsInt });
            return res.status(500).json({ Error: 'Unable to add season to database' });
        }
        LoggerImpl_1.default.info('ActiveSeasons.Controller: addSeason() - Successfully added new season', { franchise, season: seasonAsInt, seasonId: response.seasonId });
        res.status(201).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('ActiveSeasons.Controller: addSeason() - Error adding season to database', { franchise, season: seasonAsInt, error: error });
        res.status(500).json({ Error: 'Error adding new season to table' });
    }
};
exports.addSeason = addSeason;
// Doc: Updates the status of an existing season in the database.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number, status: string}, res (Response) - Express response object
// Doc: Route: Likely PUT /seasons or PATCH /seasons
const updateSeason = async (req, res) => {
    const { franchise, season, status } = req.body;
    LoggerImpl_1.default.info('ActiveSeasons.Controller: updateSeason() - Request received to update season status', { franchise, season, newStatus: status });
    let seasonAsInt = Number(season) || 0;
    if (seasonAsInt === 0 || !franchise || franchise === '' || !status || status === '') {
        LoggerImpl_1.default.error('ActiveSeasons.Controller: updateSeason() - Invalid parameters provided', { franchise, season, status });
        return res.status(400).json({ Error: 'Invalid parameters in function call' });
    }
    try {
        LoggerImpl_1.default.debug('ActiveSeasons.Controller: updateSeason() - Calling service to update season status', { franchise, season: seasonAsInt, status });
        let response = await seasonService.updateSeason(franchise, season, status);
        if (!response) {
            LoggerImpl_1.default.error('ActiveSeasons.Controller: updateSeason() - Service returned null, season not found or update failed', { franchise, season });
            return res.status(404).json({ Error: `Unable to update season status` });
        }
        LoggerImpl_1.default.info('ActiveSeasons.Controller: updateSeason() - Successfully updated season status', { franchise, season, newStatus: response.activityStatus });
        res.status(200).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('ActiveSeasons.Controller: updateSeason() - Error updating season status', { franchise, season, status, error: error });
        res.status(500).json({ Error: 'Something went wrong when updating status' });
    }
};
exports.updateSeason = updateSeason;

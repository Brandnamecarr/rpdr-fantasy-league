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
exports.getQueenId = exports.updateQueenStatus = exports.addNewQueens = exports.addNewQueen = exports.getByFranchiseAndSeason = exports.getQueenStatus = exports.getQueenByName = exports.getAllQueens = void 0;
const queenService = __importStar(require("../services/queen.service"));
const LoggerImpl_1 = __importDefault(require("../util/LoggerImpl"));
// Doc: Retrieves all queen records from the database.
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /queens
const getAllQueens = async (req, res) => {
    LoggerImpl_1.default.debug('Queen.Controller.ts: getAllQueens() - request received');
    try {
        let queens = await queenService.getAllQueens();
        if (!queens) {
            LoggerImpl_1.default.error('Queen.Controller.ts: getAllQueens() - no queens returned from service');
            return res.status(404).json({ Error: "Error fetching all queens" });
        }
        LoggerImpl_1.default.debug('Queen.Controller.ts: getAllQueens() - returning queen records', { count: queens.length });
        res.status(201).json({ queens });
    }
    catch (error) {
        LoggerImpl_1.default.error('Queen.Controller.ts: getAllQueens() - unexpected error', { error: error });
        res.status(500).json({ Error: error });
    }
};
exports.getAllQueens = getAllQueens;
// Doc: Retrieves all queen records matching a specific name.
// Doc: Args: req (Request) - Express request object with query parameter name (string), res (Response) - Express response object
// Doc: Route: Likely GET /queens/name?name=QueenName
const getQueenByName = async (req, res) => {
    const name = req.query.name;
    LoggerImpl_1.default.debug('Queen.Controller.ts: getQueenByName() - request received', { name });
    if (!name) {
        LoggerImpl_1.default.error('Queen.Controller.ts: getQueenByName() - missing required query param: name');
        return res.status(400).json({ Error: 'Name is required' });
    }
    try {
        let queenRecord = await queenService.getQueenByName(name);
        if (!queenRecord) {
            LoggerImpl_1.default.error('Queen.Controller.ts: getQueenByName() - no records found for name', { name });
            return res.status(404).json({ Error: `Error getting records for ${name}` });
        }
        LoggerImpl_1.default.debug('Queen.Controller.ts: getQueenByName() - returning records', { name, count: queenRecord.length });
        res.status(201).json(queenRecord);
    }
    catch (error) {
        LoggerImpl_1.default.error("Queen.Controller.ts: getQueenByName() - unexpected error", { name, error });
        res.status(500).json({ Error: 'Error getting Queen by name' });
    }
};
exports.getQueenByName = getQueenByName;
// Doc: Retrieves a queen's record and status by franchise, season, and name.
// Doc: Args: req (Request) - Express request object with query parameters franchise (string), season (number), and name (string), res (Response) - Express response object
// Doc: Route: Likely GET /queens/status?franchise=US&season=16&name=QueenName
const getQueenStatus = async (req, res) => {
    const franchiseParam = req.query.franchise;
    const seasonParam = req.query.season;
    const nameParam = req.query.name;
    const franchise = String(franchiseParam) || '';
    const season = Number(seasonParam) || -1;
    const name = String(nameParam) || '';
    LoggerImpl_1.default.debug('Queen.Controller.ts: getQueenStatus() - request received', { franchise, season, name });
    if (franchise === '' || name === '' || season === -1) {
        LoggerImpl_1.default.error('Queen.Controller.ts: getQueenStatus() - invalid query params', { franchise, season, name });
        return res.status(404).json({ Error: `Got bad args in query ${franchiseParam}, ${seasonParam}, ${nameParam}` });
    }
    try {
        const queen = await queenService.getQueenStatus(franchise, season, name);
        if (!queen) {
            LoggerImpl_1.default.error('Queen.Controller.ts: getQueenStatus() - no queen found matching params', { franchise, season, name });
            return res.status(404).json({ Error: "No queen found matching params" });
        }
        LoggerImpl_1.default.debug('Queen.Controller.ts: getQueenStatus() - returning queen record', { franchise, season, name });
        res.status(201).json(queen);
    }
    catch (erorr) {
        LoggerImpl_1.default.error('Queen.Controller.ts: getQueenStatus() - unexpected error', { franchise, season, name, error: erorr });
        res.status(500).json({ Error: "Error with getQueenStatus()" });
    }
};
exports.getQueenStatus = getQueenStatus;
// Doc: Retrieves all queens for a specific franchise and season.
// Doc: Args: req (Request) - Express request object with query parameters franchise (string) and season (number), res (Response) - Express response object
// Doc: Route: Likely GET /queens?franchise=US&season=16
const getByFranchiseAndSeason = async (req, res) => {
    const franchiseParam = req.query.franchise;
    const seasonParam = req.query.season;
    const franchise = String(franchiseParam) || '';
    const season = Number(seasonParam) || -1;
    if (franchise === '' || season === -1) {
        LoggerImpl_1.default.error('Queen.Controller.ts: Bad args in getByFranchiseAndSeason');
        return res.status(404).json({ Error: `Got bad args in query ${franchiseParam}, ${seasonParam}` });
    }
    try {
        const queens = await queenService.getByFranchiseAndSeason(franchise, season);
        if (!queens) {
            LoggerImpl_1.default.error('Queen.Controller.ts: Error getting by franchise and season');
            return res.status(404).json({ Error: 'Error getting queens by Franchise and Season' });
        }
        res.status(201).json(queens);
    }
    catch (error) {
        LoggerImpl_1.default.error('Queen.Controller.ts: Error in getByFranchiseAndSeason() -> ', { error: error });
        res.status(500).json({ Error: error });
    }
};
exports.getByFranchiseAndSeason = getByFranchiseAndSeason;
// Doc: Adds a new queen record to the database.
// Doc: Args: req (Request) - Express request object with body containing {name: string, franchise: string, season: number, status: QueenStatus, location?: string}, res (Response) - Express response object
// Doc: Route: Likely POST /queens
const addNewQueen = async (req, res) => {
    const { name, franchise, season, status, location } = req.body;
    LoggerImpl_1.default.debug('Queen.Controller.ts: addNewQueen() - request received', { name, franchise, season, status, location });
    let loc = '';
    if (!location) {
        loc = "UNKNOWN";
    }
    try {
        const response = await queenService.addNewQueen(name, franchise, season, location, status);
        if (!response) {
            LoggerImpl_1.default.error('Queen.Controller.ts: addNewQueen() - service returned null', { name, franchise, season });
            return res.status(404).json({ Error: "Unable to make queen matching params" });
        }
        LoggerImpl_1.default.info('Queen.Controller.ts: addNewQueen() - queen created successfully', { name, franchise, season });
        return res.status(201).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('Queen.Controller.ts: addNewQueen() - unexpected error', { name, franchise, season, error });
        res.status(500).json({ Error: "Unable to insert queen into table" });
    }
};
exports.addNewQueen = addNewQueen;
// Doc: Adds multiple queen records to the database in bulk.
// Doc: Args: req (Request) - Express request object with body containing array of {name: string, franchise: string, season: number, status: QueenStatus, location?: string}[], res (Response) - Express response object
// Doc: Route: Likely POST /queens/bulk
const addNewQueens = async (req, res) => {
    const queensData = req.body;
    LoggerImpl_1.default.debug('Queen.Controller.ts: addNewQueens() - bulk insert request received', { count: Array.isArray(queensData) ? queensData.length : 'invalid' });
    if (!Array.isArray(queensData) || queensData.length == 0) {
        LoggerImpl_1.default.error('Queen.Controller.ts: addNewQueens() - invalid or empty input array');
        return res.status(404).json({ Error: "Error with queensData input" });
    }
    try {
        let response = await queenService.addNewQueens(queensData);
        if (!response) {
            LoggerImpl_1.default.error('Queen.Controller.ts: addNewQueens() - service returned null', { count: queensData.length });
            return res.status(404).json({ Error: "Error adding list of Queens to Queen table" });
        }
        LoggerImpl_1.default.info('Queen.Controller.ts: addNewQueens() - bulk insert complete', { inserted: response.count });
        res.status(201).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('Queen.Controller.ts: addNewQueens() - unexpected error', { count: queensData.length, error });
        res.status(500).json({ Error: "Error inserting list of quenes" });
    }
};
exports.addNewQueens = addNewQueens;
// Doc: Updates a queen's status (e.g., ACTIVE, ELIMINATED, WINNER).
// Doc: Args: req (Request) - Express request object with body containing {name: string, franchise: string, season: number, status: QueenStatus}, res (Response) - Express response object
// Doc: Route: Likely PUT /queens/status or PATCH /queens/status
const updateQueenStatus = async (req, res) => {
    const { name, franchise, season, status } = req.body;
    LoggerImpl_1.default.info('Queen.Controller.ts: updateQueenStatus() - request received', { name, franchise, season, newStatus: status });
    try {
        let response = await queenService.updateQueenStatus(name, franchise, season, status);
        if (!response) {
            LoggerImpl_1.default.error('Queen.Controller.ts: updateQueenStatus() - service returned null', { name, franchise, season, status });
            return res.status(404).json({ Error: `Error updating queen ${name} status to ${status}` });
        }
        LoggerImpl_1.default.info('Queen.Controller.ts: updateQueenStatus() - status updated successfully', { name, franchise, season, status, updatedCount: response.count });
        res.status(201).json(response);
    }
    catch (error) {
        LoggerImpl_1.default.error('Queen.Controller.ts: updateQueenStatus() - unexpected error', { name, franchise, season, status, error });
        res.status(500).json({ Error: `Error updating queen ${name} status` });
    }
};
exports.updateQueenStatus = updateQueenStatus;
// Doc: Retrieves a queen's ID by franchise, season, and name.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number, name: string}, res (Response) - Express response object
// Doc: Route: Likely POST /queens/id or GET /queens/id
const getQueenId = async (req, res) => {
    const { franchise, season, name } = req.body;
    if (franchise === '' || name === '') {
        LoggerImpl_1.default.error('Queen.Controller.ts: bad parameters in request getQueenId');
        return res.status(404).json({ Error: "Invalid parameters" });
    }
    try {
        let queenRecord = await queenService.findQueenId(franchise, season, name);
        if (!queenRecord) {
            LoggerImpl_1.default.error('Queen.Controller.ts: unable to find queenID by specified parameters');
            return res.status(404).json({ Error: "Unable to find queenID by specified parameters" });
        }
        LoggerImpl_1.default.debug('Queen.Controller.ts: returning queenRecord from getQueenId()');
        res.status(201).json(queenRecord);
    }
    catch (error) {
        LoggerImpl_1.default.error('Queen.Controller.ts: error in getQueenId: ', { error });
        res.status(500).json({ Error: 'Error retrieving queenID' });
    }
};
exports.getQueenId = getQueenId;

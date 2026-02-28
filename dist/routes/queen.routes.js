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
Object.defineProperty(exports, "__esModule", { value: true });
// Doc: Route definitions for queen management endpoints. All routes are protected by JWT authentication.
// Doc: Base path: /queens (or similar, depending on app.ts configuration)
const express_1 = require("express");
const TokenManager_1 = require("../util/TokenManager");
const queenController = __importStar(require("../controllers/queen.controller"));
const router = (0, express_1.Router)();
// Doc: Middleware to protect all routes in this router with JWT authentication
router.use(TokenManager_1.protect);
// Doc: GET /queens/getAll - Retrieves all queen records
router.get("/getAll", queenController.getAllQueens);
// Doc: GET /queens/getQueenByName?name=QueenName - Retrieves all records for a specific queen by name
router.get("/getQueenByName", queenController.getQueenByName);
// Doc: GET /queens/getQueensByFranSeas?franchise=US&season=16 - Retrieves all queens for a franchise and season
router.get("/getQueensByFranSeas", queenController.getByFranchiseAndSeason);
// Doc: GET /queens/getQueenStatus?franchise=US&season=16&name=QueenName - Retrieves a queen's status
router.get("/getQueenStatus", queenController.getQueenStatus);
// Doc: POST /queens/addNewQueen - Creates a new queen record (body: {name, franchise, season, status, location})
router.post("/addNewQueen", queenController.addNewQueen);
// Doc: POST /queens/addNewQueens - Creates multiple queen records in bulk (body: array of queen objects)
router.post("/addNewQueens", queenController.addNewQueens);
// Doc: POST /queens/updateQueenStatus - Updates a queen's status (body: {name, franchise, season, status})
router.post("/updateQueenStatus", queenController.updateQueenStatus);
// Doc: POST /queens/getQueenId - Retrieves a queen's ID (body: {franchise, season, name})
router.post("/getQueenId", queenController.getQueenId);
exports.default = router;

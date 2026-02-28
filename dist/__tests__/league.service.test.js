"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../util/LoggerImpl', () => ({
    __esModule: true,
    default: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));
jest.mock('../db/prisma.client', () => ({
    __esModule: true,
    default: {
        league: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        activeSeasons: {
            findMany: jest.fn(),
        },
        roster: {
            create: jest.fn(),
        },
    },
}));
const prisma_client_1 = __importDefault(require("../db/prisma.client"));
const league_service_1 = require("../services/league.service");
const p = prisma_client_1.default;
const makeLeague = (overrides = {}) => ({
    id: 1,
    leagueName: 'TestLeague',
    owner: 'owner@werk.com',
    users: ['user@werk.com'],
    maxPlayers: 10,
    maxQueensPerTeam: 5,
    franchise: 'US',
    season: 16,
    createdAt: new Date(),
    ...overrides,
});
const makeSeason = (franchise, season, status) => ({
    id: 1,
    franchise,
    season,
    activityStatus: status,
    createdAt: new Date(),
});
beforeEach(() => {
    jest.clearAllMocks();
});
// ─── getInactiveLeaguesByUser ─────────────────────────────────────────────────
describe('getInactiveLeaguesByUser', () => {
    it('returns only leagues whose franchise/season is INACTIVE', async () => {
        const activeLeague = makeLeague({ franchise: 'US', season: 17 });
        const inactiveLeague = makeLeague({ id: 2, leagueName: 'OldLeague', franchise: 'US', season: 16 });
        p.league.findMany.mockResolvedValue([activeLeague, inactiveLeague]);
        p.activeSeasons.findMany.mockResolvedValue([
            makeSeason('US', 16, 'INACTIVE'),
        ]);
        const result = await (0, league_service_1.getInactiveLeaguesByUser)('user@werk.com');
        expect(result).toHaveLength(1);
        expect(result[0].leagueName).toBe('OldLeague');
    });
    it('returns an empty array when the user has no leagues in inactive seasons', async () => {
        const activeLeague = makeLeague({ franchise: 'US', season: 17 });
        p.league.findMany.mockResolvedValue([activeLeague]);
        p.activeSeasons.findMany.mockResolvedValue([
            makeSeason('US', 16, 'INACTIVE'),
        ]);
        const result = await (0, league_service_1.getInactiveLeaguesByUser)('user@werk.com');
        expect(result).toHaveLength(0);
    });
    it('returns all user leagues when every season is inactive', async () => {
        const league1 = makeLeague({ id: 1, franchise: 'US', season: 14 });
        const league2 = makeLeague({ id: 2, franchise: 'UK', season: 5 });
        p.league.findMany.mockResolvedValue([league1, league2]);
        p.activeSeasons.findMany.mockResolvedValue([
            makeSeason('US', 14, 'INACTIVE'),
            makeSeason('UK', 5, 'INACTIVE'),
        ]);
        const result = await (0, league_service_1.getInactiveLeaguesByUser)('user@werk.com');
        expect(result).toHaveLength(2);
    });
    it('returns an empty array when the user is in no leagues at all', async () => {
        p.league.findMany.mockResolvedValue([]);
        p.activeSeasons.findMany.mockResolvedValue([
            makeSeason('US', 16, 'INACTIVE'),
        ]);
        const result = await (0, league_service_1.getInactiveLeaguesByUser)('user@werk.com');
        expect(result).toHaveLength(0);
    });
    it('does not return leagues from a different franchise even if the season number matches', async () => {
        // US season 5 is inactive, but the user's league is UK season 5 (different franchise)
        const ukLeague = makeLeague({ franchise: 'UK', season: 5 });
        p.league.findMany.mockResolvedValue([ukLeague]);
        p.activeSeasons.findMany.mockResolvedValue([
            makeSeason('US', 5, 'INACTIVE'),
        ]);
        const result = await (0, league_service_1.getInactiveLeaguesByUser)('user@werk.com');
        expect(result).toHaveLength(0);
    });
});
// ─── getAvailableLeagues ──────────────────────────────────────────────────────
describe('getAvailableLeagues', () => {
    it('returns only leagues with open spots', async () => {
        const full = makeLeague({ id: 1, users: ['a@a.com', 'b@b.com'], maxPlayers: 2 });
        const open = makeLeague({ id: 2, users: ['a@a.com'], maxPlayers: 5 });
        p.league.findMany.mockResolvedValue([full, open]);
        const result = await (0, league_service_1.getAvailableLeagues)();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });
    it('returns an empty array when all leagues are full', async () => {
        const full = makeLeague({ users: ['a@a.com'], maxPlayers: 1 });
        p.league.findMany.mockResolvedValue([full]);
        const result = await (0, league_service_1.getAvailableLeagues)();
        expect(result).toHaveLength(0);
    });
});

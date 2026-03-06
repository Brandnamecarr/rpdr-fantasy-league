jest.mock('../util/LoggerImpl', () => ({
    __esModule: true,
    default: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

jest.mock('../db/prisma.client', () => ({
    __esModule: true,
    default: {
        roster: {
            findMany: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        league: {
            update: jest.fn(),
        },
        fanSurveyResponse: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

import prisma from '../db/prisma.client';
import {
    weeklyUpdate,
    weeklySurvey,
    addUserToLeague,
    removeUserFromLeague,
    computeFanSurvey,
} from '../services/leagueOps.service';
import { PointManipulation, FanSurveyPoints } from '../enums/enums';

// Typed convenience reference to the prisma mock
const p = prisma as unknown as {
    roster: { findMany: jest.Mock; update: jest.Mock; create: jest.Mock };
    league: { update: jest.Mock };
    fanSurveyResponse: { findMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
};

const makeRoster = (overrides: Partial<any> = {}): any => ({
    recordId: 1,
    leagueName: 'TestLeague',
    username: 'queen@werk.com',
    teamName: 'Team A',
    queens: [],
    currentPoints: 0,
    pointUpdates: [],
    franchise: 'US',
    season: 17,
    ...overrides,
});

const makeLeague = (overrides: Partial<any> = {}): any => ({
    id: 1,
    leagueName: 'TestLeague',
    owner: 'owner@werk.com',
    users: [],
    maxPlayers: 10,
    maxQueensPerTeam: 5,
    franchise: 'US',
    season: 17,
    createdAt: new Date(),
    ...overrides,
});

beforeEach(() => {
    jest.clearAllMocks();
    // Default $transaction to execute the array of promises
    p.$transaction.mockImplementation((promises: any[]) => Promise.all(promises));
    // Default update to resolve with a dummy roster
    p.roster.update.mockResolvedValue(makeRoster());
});

// ─── weeklyUpdate ───────────────────────────────────────────────────────────

describe('weeklyUpdate', () => {
    it('awards MAXI_CHALLENGE_WIN points to the maxi winner\'s roster', async () => {
        const roster = makeRoster({ queens: ['Sasha'] });
        p.roster.findMany.mockResolvedValue([roster]);

        await weeklyUpdate('US', 17, ['Sasha'], false, [], [], [], [], [], []);

        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { recordId: 1 },
                data: expect.objectContaining({
                    currentPoints: { increment: PointManipulation.MAXI_CHALLENGE_WIN },
                }),
            })
        );
    });

    it('awards SNATCH_GAME_WIN (30) instead of MAXI_CHALLENGE_WIN (25) when isSnatchGame is true', async () => {
        const roster = makeRoster({ queens: ['Katya'] });
        p.roster.findMany.mockResolvedValue([roster]);

        await weeklyUpdate('US', 17, ['Katya'], true, [], [], [], [], [], []);

        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: PointManipulation.SNATCH_GAME_WIN },
                }),
            })
        );
    });

    it('applies ELIMINATED penalty to an eliminated queen\'s roster', async () => {
        const roster = makeRoster({ queens: ['Aja'] });
        p.roster.findMany.mockResolvedValue([roster]);

        await weeklyUpdate('US', 17, [], false, [], [], [], [], [], ['Aja']);

        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: PointManipulation.ELIMINATED },
                }),
            })
        );
    });

    it('adds MINI_CHALLENGE_WIN on top of a SAFE placement (additive)', async () => {
        // Queen is safe (15) AND won the mini (+20) = 35
        const roster = makeRoster({ queens: ['Nina'] });
        p.roster.findMany.mockResolvedValue([roster]);

        await weeklyUpdate('US', 17, [], false, ['Nina'], [], ['Nina'], [], [], []);

        const expected = PointManipulation.SAFE_PLACEMENT + PointManipulation.MINI_CHALLENGE_WIN;
        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: expected },
                }),
            })
        );
    });

    it('maxi winner overwrites top placement (maxi takes priority)', async () => {
        // Queen in topQueens AND maxiWinner — maxi should override, not stack
        const roster = makeRoster({ queens: ['Trinity'] });
        p.roster.findMany.mockResolvedValue([roster]);

        await weeklyUpdate('US', 17, ['Trinity'], false, [], ['Trinity'], [], [], [], []);

        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: PointManipulation.MAXI_CHALLENGE_WIN },
                }),
            })
        );
    });

    it('scores zero for queens not in any placement category', async () => {
        const roster = makeRoster({ queens: ['UnknownQueen'] });
        p.roster.findMany.mockResolvedValue([roster]);

        await weeklyUpdate('US', 17, ['Sasha'], false, [], ['Trinity'], ['Nina'], [], [], []);

        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: 0 },
                }),
            })
        );
    });

    it('returns null when no rosters are found', async () => {
        p.roster.findMany.mockResolvedValue(null);

        const result = await weeklyUpdate('US', 17, [], false, [], [], [], [], [], []);

        expect(result).toBeNull();
    });
});

// ─── weeklySurvey ────────────────────────────────────────────────────────────

describe('weeklySurvey', () => {
    it('awards GOOD_RUNWAY points for a toot', async () => {
        const roster = makeRoster({ queens: ['Shea'], pointUpdates: [10] });
        p.roster.findMany.mockResolvedValue([roster]);

        await weeklySurvey(['Shea'], [], [], [], []);

        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: PointManipulation.GOOD_RUNWAY },
                }),
            })
        );
    });

    it('applies BAD_RUNWAY penalty for a boot', async () => {
        const roster = makeRoster({ queens: ['Alexis'], pointUpdates: [5] });
        p.roster.findMany.mockResolvedValue([roster]);

        await weeklySurvey([], ['Alexis'], [], [], []);

        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: PointManipulation.BAD_RUNWAY },
                }),
            })
        );
    });

    it('stacks ICONIC_MOMENT on top of a toot', async () => {
        const roster = makeRoster({ queens: ['Monet'], pointUpdates: [0] });
        p.roster.findMany.mockResolvedValue([roster]);

        // Toot (20) + Iconic (15) = 35
        await weeklySurvey(['Monet'], [], ['Monet'], [], []);

        const expected = PointManipulation.GOOD_RUNWAY + PointManipulation.ICONIC_MOMENT;
        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: expected },
                }),
            })
        );
    });
});

// ─── addUserToLeague ─────────────────────────────────────────────────────────

describe('addUserToLeague', () => {
    it('returns null if the user is already in the league', async () => {
        const league = makeLeague({ users: ['existing@werk.com'] });

        const result = await addUserToLeague('existing@werk.com', 'MyTeam', league, [], 'US', 17);

        expect(result).toBeNull();
        expect(p.league.update).not.toHaveBeenCalled();
    });

    it('returns null if the league is at max capacity', async () => {
        const league = makeLeague({ users: ['a@werk.com'], maxPlayers: 1 });

        const result = await addUserToLeague('newuser@werk.com', 'MyTeam', league, [], 'US', 17);

        expect(result).toBeNull();
        expect(p.league.update).not.toHaveBeenCalled();
    });

    it('creates a roster and updates the league when the user can join', async () => {
        const newRoster = makeRoster({ username: 'newuser@werk.com' });
        const league = makeLeague({ users: [], maxPlayers: 5 });

        p.league.update.mockResolvedValue({ ...league, users: ['newuser@werk.com'] });
        p.roster.create.mockResolvedValue(newRoster);

        const result = await addUserToLeague('newuser@werk.com', 'MyTeam', league, ['QueenA'], 'US', 17);

        expect(p.league.update).toHaveBeenCalledTimes(1);
        expect(p.roster.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    username: 'newuser@werk.com',
                    teamName: 'MyTeam',
                }),
            })
        );
        expect(result).not.toBeNull();
    });
});

// ─── removeUserFromLeague ─────────────────────────────────────────────────────

describe('removeUserFromLeague', () => {
    it('does not call prisma.update if the user is not in the league', async () => {
        const league = makeLeague({ users: ['someone@werk.com'] });

        await removeUserFromLeague('nothere@werk.com', league);

        expect(p.league.update).not.toHaveBeenCalled();
    });

    it('updates the league users array when removing a valid member', async () => {
        const league = makeLeague({ users: ['remove@werk.com', 'keep@werk.com'] });
        p.league.update.mockResolvedValue({ ...league, users: ['keep@werk.com'] });

        await removeUserFromLeague('remove@werk.com', league);

        expect(p.league.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: league.id },
                data: { users: ['keep@werk.com'] },
            })
        );
    });
});

// ─── computeFanSurvey (exercises tallyVotes) ─────────────────────────────────

describe('computeFanSurvey', () => {
    it('returns null when there are no survey responses', async () => {
        p.fanSurveyResponse.findMany.mockResolvedValue([]);

        const result = await computeFanSurvey('US', 17, 1);

        expect(result).toBeNull();
    });

    it('awards the correct fan survey points to the plurality queen', async () => {
        const responses = [
            { queenOfTheWeek: 'Sasha', bottomOfTheWeek: 'Aja', lipSyncWinner: 'Trinity', bestDressed: 'Sasha', worstDressed: 'Aja' },
            { queenOfTheWeek: 'Sasha', bottomOfTheWeek: 'Aja', lipSyncWinner: 'Trinity', bestDressed: 'Sasha', worstDressed: 'Aja' },
        ];
        p.fanSurveyResponse.findMany.mockResolvedValue(responses);

        // Sasha: queen of week (10) + best dressed (20) = 30
        const sashaRoster = makeRoster({ queens: ['Sasha'], pointUpdates: [0] });
        p.roster.findMany.mockResolvedValue([sashaRoster]);

        await computeFanSurvey('US', 17, 1);

        const expected = FanSurveyPoints.QUEEN_OF_WEEK + FanSurveyPoints.BEST_DRESSED;
        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: expected },
                }),
            })
        );
    });

    it('awards fan survey points to ALL queens tied for the plurality', async () => {
        // Sasha and Katya each get 1 vote for queen of the week — it\'s a tie
        const responses = [
            { queenOfTheWeek: 'Sasha', bottomOfTheWeek: 'Aja', lipSyncWinner: 'Trinity', bestDressed: 'Trinity', worstDressed: 'Aja' },
            { queenOfTheWeek: 'Katya', bottomOfTheWeek: 'Aja', lipSyncWinner: 'Trinity', bestDressed: 'Trinity', worstDressed: 'Aja' },
        ];
        p.fanSurveyResponse.findMany.mockResolvedValue(responses);

        const sashaRoster = makeRoster({ recordId: 1, queens: ['Sasha'], pointUpdates: [0] });
        const katyaRoster = makeRoster({ recordId: 2, queens: ['Katya'], pointUpdates: [0] });
        p.roster.findMany.mockResolvedValue([sashaRoster, katyaRoster]);
        p.roster.update.mockResolvedValue(makeRoster());

        await computeFanSurvey('US', 17, 1);

        const calls = p.roster.update.mock.calls;
        const sashaCall = calls.find((c: any[]) => c[0].where.recordId === 1);
        const katyaCall = calls.find((c: any[]) => c[0].where.recordId === 2);

        // Both tied queens should receive QUEEN_OF_WEEK points
        expect(sashaCall![0].data.currentPoints.increment).toBe(FanSurveyPoints.QUEEN_OF_WEEK);
        expect(katyaCall![0].data.currentPoints.increment).toBe(FanSurveyPoints.QUEEN_OF_WEEK);
    });

    it('applies negative points for bottom-of-week and worst-dressed winners', async () => {
        const responses = [
            { queenOfTheWeek: 'Sasha', bottomOfTheWeek: 'Aja', lipSyncWinner: 'Trinity', bestDressed: 'Sasha', worstDressed: 'Aja' },
        ];
        p.fanSurveyResponse.findMany.mockResolvedValue(responses);

        // Aja: bottom of week (-5) + worst dressed (-5) = -10
        const ajaRoster = makeRoster({ queens: ['Aja'], pointUpdates: [0] });
        p.roster.findMany.mockResolvedValue([ajaRoster]);

        await computeFanSurvey('US', 17, 1);

        const expected = FanSurveyPoints.BOTTOM_OF_WEEK + FanSurveyPoints.WORST_DRESSED;
        expect(p.roster.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    currentPoints: { increment: expected },
                }),
            })
        );
    });
});

import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

import { getLeague } from "./league.service";
import {League, Roster, User} from '@prisma/client';
import {WeeklyBonusPoints, PointManipulation, LeaguePointAwards, FanSurveyPoints} from '../enums/enums';
import { QueenStatus } from "@prisma/client";

// Doc: Helper function that calculates point changes for queens based on weekly episode results.
// Doc: Args: maxiWinner (string[]) - Maxi challenge winners, isSnatchGame (boolean) - Whether episode is Snatch Game, miniWinner (string[]) - Mini challenge winners, topQueens (string[]) - Top placement queens, safeQueens (string[]) - Safe queens, bottomQueens (string[]) - Bottom placement queens, lipSyncWinner (string[]) - Lip sync winners, eliminated (string[]) - Eliminated queens
// Doc: Returns: Record<string, number> - Object mapping queen names to their point changes
const weeklyUpdateObjectHelper = (maxiWinner: string[], isSnatchGame: boolean, miniWinner: string[],
    topQueens: string[], safeQueens: string[], bottomQueens: string[], lipSyncWinner: string[],
    eliminated: string[]
    ) => {
        logger.debug('LeagueOps.Service.ts: weeklyUpdateObjectHelper() - building score map', {maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated});
        // make update obj //
        let weeklyQueenScores: Record<string, number> = {};

        let maxiPointIncrease = isSnatchGame ? PointManipulation.SNATCH_GAME_WIN : PointManipulation.MAXI_CHALLENGE_WIN;
        // Bottom/Eliminated
        bottomQueens.forEach(q => weeklyQueenScores[q] = PointManipulation.BOTTOM_THREE_PLACEMENT);
        eliminated.forEach(q => weeklyQueenScores[q] = PointManipulation.ELIMINATED);
        
        // Safe
        safeQueens.forEach(q => weeklyQueenScores[q] = PointManipulation.SAFE_PLACEMENT);
        
        // Tops (High placement)
        topQueens.forEach(q => weeklyQueenScores[q] = PointManipulation.TOP_PLACEMENT);
        
        // Maxi Winners (Highest priority - will overwrite a Top placement if queen is in both)
        maxiWinner.forEach(q => weeklyQueenScores[q] = maxiPointIncrease);

        // 2. Handle Independent Bonuses (Add-ons)
        // If Mini Wins or Lip Sync Wins are "extra" points on top of their placement:
        miniWinner.forEach(q => {
            weeklyQueenScores[q] = (weeklyQueenScores[q] || 0) + PointManipulation.MINI_CHALLENGE_WIN;
        });

        lipSyncWinner.forEach(q => {
            weeklyQueenScores[q] = (weeklyQueenScores[q] || 0) + PointManipulation.WINS_LIPSYNCH;
        });

        logger.debug('LeagueOps.Service.ts: weeklyUpdateObjectHelper() - score map built', {scoredQueens: Object.keys(weeklyQueenScores).length});
        return weeklyQueenScores;
    };

// Doc: Processes weekly episode results and updates all affected rosters' points using a database transaction.
// Doc: Args: franchise (string) - Franchise name, season (number) - Season number, maxiWinner (string[]) - Maxi challenge winners, isSnatchGame (boolean) - Whether episode is Snatch Game, miniWinner (string[]) - Mini challenge winners, topQueens (string[]) - Top placement queens, safeQueens (string[]) - Safe queens, bottomQueens (string[]) - Bottom placement queens, lipSyncWinner (string[]) - Lip sync winners, eliminated (string[]) - Eliminated queens
// Doc: Returns: Promise<Roster[] | null> - Array of updated roster records or null on failure
export const weeklyUpdate = async (franchise: string, season: number, maxiWinner: string[], isSnatchGame: boolean, miniWinner: string[], topQueens: string[],
    safeQueens: string[], bottomQueens: string[], lipSyncWinner: string[], eliminated: string[]) => {
        logger.info('LeagueOps.Service.ts: weeklyUpdate() - processing weekly episode results', {franchise, season, maxiWinner, isSnatchGame, eliminated});

        // make weeklyQueenUpdateScores object:
        let weeklyQueenScores = weeklyUpdateObjectHelper(maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated);
        if(!weeklyQueenScores) {
            logger.error('LeagueOps.Service.ts: weeklyQueenScores is null');
            return null;
        }

        // 1. load all records from the Roster column
        try {
            let rosters = await getRostersByFranchiseAndLeague(franchise, season);

            if(!rosters) {
                logger.error('LeagueOps.Service.ts: weeklyUpdate() - no rosters found for franchise/season', {franchise, season});
                return null;
            }
            logger.debug('LeagueOps.Service.ts: weeklyUpdate() - loaded rosters to update', {rosterCount: rosters.length, franchise, season});

            // 2. Iterate through the records and then update them...
            const updatePromises = rosters.map((roster) => {
                // Calculate how many points this specific user earned this week
                // based on the queens currently in their roster array
                const pointsEarnedThisWeek = roster.queens.reduce((total, queenName) => {
                    const score = weeklyQueenScores[queenName] || 0;
                    return total + score;
                }, 0);
        
                // Return the update operation (don't 'await' it yet)
                return prisma.roster.update({
                where: { recordId: roster.recordId },
                data: {
                    currentPoints: {
                        increment: pointsEarnedThisWeek,
                    },
                    pointUpdates: {
                        push: pointsEarnedThisWeek,
                    },
                },
                });
            }); // updatePromises //
        
            // 3. Execute all updates as a single transaction
            // This is much faster and safer than updating one-by-one in a loop
            const results = await prisma.$transaction(updatePromises);
        
            logger.info(`LeagueOps.Service.ts: Just updated ${results.length} records`);
            return results;
        
        } catch (error) {
          logger.error(`LeagueOps.Service.ts: weeklyUpdate() - transaction failed`, {franchise, season, error});
          return null;
        }
};

// Doc: Helper function that calculates bonus/penalty points from weekly survey results.
// Doc: Args: toots (string[]) - Queens with good runways, boots (string[]) - Queens with bad runways, iconicQueens (string[]) - Queens with iconic moments, cringeQueens (string[]) - Queens with cringe moments, queenOfTheWeek (string[]) - Queen(s) of the week
// Doc: Returns: Record<string, number> - Object mapping queen names to their point adjustments
const weeklySurveyObjectHelper = (toots: string[], boots: string[], iconicQueens: string[], cringeQueens: string[], queenOfTheWeek: string[]) => {
    logger.debug('LeagueOps.Service.ts: weeklySurveyObjectHelper() - building survey score map', {toots, boots, iconicQueens, cringeQueens, queenOfTheWeek});
    let update: Record<string, number> = {};

    toots.forEach(q => update[q] = PointManipulation.GOOD_RUNWAY);
    boots.forEach(q => update[q] = PointManipulation.BAD_RUNWAY);

    iconicQueens.forEach(
        q => {
            if (q in update) {
                update[q] += PointManipulation.ICONIC_MOMENT;
            }
            else {
                update[q] = PointManipulation.ICONIC_MOMENT;
            }
        }
    ); // iconicQueens //

    cringeQueens.forEach(q => {
        if(q in update) {
            update[q] += PointManipulation.CRINGE_MOMENT;
        }
        else {
            update[q] = PointManipulation.CRINGE_MOMENT;
        }
    }); // cringeQueens //

    queenOfTheWeek.forEach(q=> {
        if(q in update) {
            update[q] += WeeklyBonusPoints.LEAGUE_QUEEN_OF_WEEK;
        } else {
            update[q] = WeeklyBonusPoints.LEAGUE_QUEEN_OF_WEEK;
        }
    }); // queenOfTheWeek //
    logger.debug('LeagueOps.Service.ts: weeklySurveyObjectHelper() - survey score map built', {scoredQueens: Object.keys(update).length});
    return update;
};

// Doc: Processes weekly survey results and updates all rosters' points based on bonus/penalty categories.
// Doc: Args: toots (string[]) - Queens with good runways, boots (string[]) - Queens with bad runways, iconicQueens (string[]) - Queens with iconic moments, cringeQueens (string[]) - Queens with cringe moments, queenOfTheWeek (string[]) - Queen(s) of the week
// Doc: Returns: Promise<Roster[] | null> - Array of updated roster records or null on failure
export const weeklySurvey = async (toots: string[], boots: string[], iconicQueens: string[], cringeQueens: string[], queenOfTheWeek: string[]) => {
    logger.info('LeagueOps.Service.ts: weeklySurvey() - processing weekly survey results', {tootCount: toots.length, bootCount: boots.length, queenOfTheWeek});
    //1. Do point adjustments //
    let weeklySurveyUpdate = weeklySurveyObjectHelper(toots, boots, iconicQueens, cringeQueens, queenOfTheWeek);
    if(!weeklySurveyUpdate) {
        logger.error('LeagueOps.Service.ts: weeklySurveyUpdate cant be null');
        return null;
    }

    //2. Load all rosters //
    try {
        let rosters = await getAllRosters();
        if(!rosters) {
            logger.error("LeagueOps.Service.ts: weeklySurvey() - failed to load rosters from database");
            return null;
        }
        logger.debug('LeagueOps.Service.ts: weeklySurvey() - loaded rosters for survey update', {rosterCount: rosters.length});
        // 3. Handle updates //
        const updatePromises = rosters.map((roster) => {
            // Calculate how many points this specific user earned this week
            // based on the queens currently in their roster array
            const pointsEarnedThisWeek = roster.queens.reduce((total, queenName) => {
                const score = weeklySurveyUpdate[queenName] || 0;
                return total + score;
            }, 0);

            const pointUpdateArray = [...roster.pointUpdates];
            if(pointUpdateArray.length > 0) {
                pointUpdateArray[pointUpdateArray.length-1] += pointsEarnedThisWeek;
            } else {
                pointUpdateArray.push(pointsEarnedThisWeek);
            }
    
            return prisma.roster.update({
                where: { recordId: roster.recordId },
                    data: {
                        currentPoints: {
                            increment: pointsEarnedThisWeek,
                        },
                        pointUpdates: {
                            set: pointUpdateArray,
                        },
                    },
                });
            }); // updatePromises //
    
        // 3. Execute all updates as a single transaction
        // This is much faster and safer than updating one-by-one in a loop
        const results = await prisma.$transaction(updatePromises);
    
        logger.info(`LeagueOps.Service.ts: Just updated ${results.length} records`, {info: "weeklySurvey log"});
        return results;
        
    } catch (error) {
        logger.error('LeagueOps.Service.ts: Failed to update points for weeklySurvey(): ', {error: error});
    }

    return null;
};

// Doc: Adds a user to a league and creates their roster if there's space and they're not already a member.
// Doc: Args: email (string) - User email, teamName (string) - Team name, league (League) - League object to join, queens (Array<string>) - Selected queens, franchise (string) - Franchise name, season (number) - Season number
// Doc: Returns: Promise<Roster | null> - The created roster record or null if user already in league or league is full
export const addUserToLeague = async (email: string, teamName: string, league: League, queens: Array<string>, franchise: string, season: number) => {
    logger.debug('leageOps.service.ts: addUserToLeague: ', {email: email, name: league.id});

    // 1. Check to see if user is already registered for this league.
    const isAlreadyInLeague: boolean = league.users.includes(email);

    if(!isAlreadyInLeague) {
        logger.debug('leagueOps.Service.ts: User is not already in the league',{});
        // 2. check size of users array, make sure that adding this user won't go over maximum
        if ((league.users.length + 1) <= league.maxPlayers) {
            let updatedPayload = {
                users: {
                    push: email,
                },
            };
            // 3. Update the record for the League table
            logger.debug('leagueOps.Service.ts: adding user to the league', {});
            await prisma.league.update({
                where: {
                    leagueName: league.leagueName,
                },
                data: updatedPayload,
            });
            
            // 4. Make a new record in the Roster Table
            return await prisma.roster.create({
                data: {
                    leagueName: league.leagueName,
                    franchise: franchise,
                    season: season,
                    teamName: teamName,
                    username: email,
                    queens: queens,
                    currentPoints: 0
                },
            });
        } else {
            logger.error('leagueOps.Service.ts: not enough room to add the player');
            return null;
        }
    }
    else {
        logger.error(`leagueOps.Service.ts: user ${email} already in users of ${league.leagueName}`);
        return null;
    }
};

// Doc: Removes a user from a league by filtering them out of the users array.
// Doc: Args: email (string) - User email to remove, league (League) - League object to remove user from
// Doc: Returns: Promise<void> - TODO: Should also remove the roster record
export const removeUserFromLeague = async (email: string, league: League) => {
    logger.info('LeagueOps.Service.ts: removeUserFromLeague() - attempting to remove user', {email, leagueName: league.leagueName});
    // 1. Check that the player is in the user list
    let isInUsers: boolean = league.users.includes(email);

    // 2. Filter the user out of the list of users in the league record
    if(isInUsers) {
        const updatedUsersArray = league.users.filter(userEmail => userEmail !== email);
        let updatePayload = {
            users: updatedUsersArray,
        };
        // 3. Update the table in the database
        await prisma.league.update({
            where: {
                id: league.id,
            },
            data: updatePayload,
        });
        logger.info('LeagueOps.Service.ts: removeUserFromLeague() - user removed from league users array', {email, leagueName: league.leagueName});

        // 4. Remove the corresponding record from the records table too
        // TODO.
    } else {
        logger.error('LeagueOps.Service.ts: removeUserFromLeague() - user not found in league users array', {email, leagueName: league.leagueName});
    }
};

// Doc: TODO: Creates a new roster record (currently not implemented).
// Doc: Args: leagueName (string) - League name, email (string) - User email, teamName (string) - Team name, queens (string[]) - Selected queens, franchise (string) - Franchise name, season (number) - Season number
// Doc: Returns: null - Not yet implemented
export const addNewRoster = (leagueName: string, email: string, teamName: string, queens: string[], franchise: string, season: number) => {
    logger.error('LeagueOps.Service.ts: addNewRoster() - not yet implemented', {leagueName, email, teamName, franchise, season});
    return null;
};

// Doc: Queries the database for all rosters belonging to a specific league.
// Doc: Args: leagueName (string) - The league name to filter by
// Doc: Returns: Promise<Roster[]> - Array of roster records for the specified league
export const getAllRostersByLeague = (leagueName: string) => {
    logger.debug('LeagueOps.Service.ts: getAllRostersByLeague() - fetching rosters for league', {leagueName});
    return prisma.roster.findMany({
        where: {
            leagueName: leagueName,
        },
    });
};

// Doc: Queries the database for all roster records.
// Doc: Args: None
// Doc: Returns: Promise<Roster[]> - Array of all roster records
export const getAllRosters = () => {
    logger.debug('LeagueOps.Service.ts: getAllRosters() - fetching all roster records');
    return prisma.roster.findMany();
};

// Doc: Queries the database for all rosters filtered by franchise and season.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<Roster[]> - Array of roster records matching franchise and season
export const getRostersByFranchiseAndLeague = (franchise: string, season: number) => {
    logger.debug('LeagueOps.Service.ts: getRostersByFranchiseAndLeague() - fetching rosters', {franchise, season});
    return prisma.roster.findMany({
        where: {
            franchise: franchise,
            season: season,
        },
    });
};

// Doc: Stores an individual fan survey response. Enforces one submission per user per episode via a unique constraint.
// Doc: Args: franchise, season, episode - identify the episode; submittedBy - user email; queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed - selected queen names
// Doc: Returns: Promise<FanSurveyResponse> - The created response record, or throws if user already submitted
export const submitFanSurvey = async (
    franchise: string, season: number, episode: number, submittedBy: string,
    queenOfTheWeek: string, bottomOfTheWeek: string, lipSyncWinner: string,
    bestDressed: string, worstDressed: string
) => {
    logger.info('LeagueOps.Service.ts: submitFanSurvey() - storing fan survey response', {franchise, season, episode, submittedBy});
    return prisma.fanSurveyResponse.create({
        data: { franchise, season, episode, submittedBy, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed }
    });
};

// Doc: Helper — counts votes per queen for a given field and returns all queens tied for the plurality.
const tallyVotes = (responses: any[], field: string): string[] => {
    const counts: Record<string, number> = {};
    responses.forEach(r => {
        const val = r[field] as string;
        counts[val] = (counts[val] || 0) + 1;
    });
    const maxVotes = Math.max(...Object.values(counts));
    return Object.entries(counts).filter(([, v]) => v === maxVotes).map(([k]) => k);
};

// Doc: Tallies all fan survey responses for an episode, finds the plurality winner(s) per category, and adjusts all roster points accordingly.
// Doc: Awards points to all tied queens in the event of a tie. Should be called after the Friday-Thursday survey window closes.
// Doc: Args: franchise, season, episode - identify the episode to compute
// Doc: Returns: Promise<Roster[] | null> - Updated roster records or null if no responses found
export const computeFanSurvey = async (franchise: string, season: number, episode: number) => {
    logger.info('LeagueOps.Service.ts: computeFanSurvey() - tallying votes', {franchise, season, episode});

    const responses = await prisma.fanSurveyResponse.findMany({ where: { franchise, season, episode } });
    if (responses.length === 0) {
        logger.error('LeagueOps.Service.ts: computeFanSurvey() - no responses found for episode', {franchise, season, episode});
        return null;
    }

    // Tally each category — ties give points to all tied queens
    const queensOfWeek  = tallyVotes(responses, 'queenOfTheWeek');
    const bottomQueens  = tallyVotes(responses, 'bottomOfTheWeek');
    const lipSyncWins   = tallyVotes(responses, 'lipSyncWinner');
    const bestDressed   = tallyVotes(responses, 'bestDressed');
    const worstDressed  = tallyVotes(responses, 'worstDressed');

    logger.info('LeagueOps.Service.ts: computeFanSurvey() - vote results', {queensOfWeek, bottomQueens, lipSyncWins, bestDressed, worstDressed});

    // Build score map
    const scores: Record<string, number> = {};
    const addScore = (queens: string[], pts: number) =>
        queens.forEach(q => { scores[q] = (scores[q] || 0) + pts; });

    addScore(queensOfWeek, FanSurveyPoints.QUEEN_OF_WEEK);
    addScore(bottomQueens,  FanSurveyPoints.BOTTOM_OF_WEEK);
    addScore(lipSyncWins,   FanSurveyPoints.LIP_SYNC_WINNER);
    addScore(bestDressed,   FanSurveyPoints.BEST_DRESSED);
    addScore(worstDressed,  FanSurveyPoints.WORST_DRESSED);

    try {
        const rosters = await getRostersByFranchiseAndLeague(franchise, season);
        if (!rosters || rosters.length === 0) {
            logger.error('LeagueOps.Service.ts: computeFanSurvey() - no rosters found', {franchise, season});
            return null;
        }

        const updatePromises = rosters.map(roster => {
            const pointsEarned = roster.queens.reduce((total, queenName) =>
                total + (scores[queenName] || 0), 0);

            const pointUpdateArray = [...roster.pointUpdates];
            if (pointUpdateArray.length > 0) {
                pointUpdateArray[pointUpdateArray.length - 1] += pointsEarned;
            } else {
                pointUpdateArray.push(pointsEarned);
            }

            return prisma.roster.update({
                where: { recordId: roster.recordId },
                data: {
                    currentPoints: { increment: pointsEarned },
                    pointUpdates:  { set: pointUpdateArray }
                }
            });
        });

        const results = await prisma.$transaction(updatePromises);
        logger.info(`LeagueOps.Service.ts: computeFanSurvey() - updated ${results.length} rosters`, {franchise, season, episode});
        return results;
    } catch (error) {
        logger.error('LeagueOps.Service.ts: computeFanSurvey() - transaction failed', {franchise, season, episode, error});
        return null;
    }
};
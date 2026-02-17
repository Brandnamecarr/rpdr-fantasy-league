import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

import { getLeague } from "./league.service";
import {League, Roster, User} from '@prisma/client';
import {WeeklyBonusPoints, PointManipulation, LeaguePointAwards} from '../enums/enums';
import { QueenStatus } from "@prisma/client";

// Doc: Helper function that calculates point changes for queens based on weekly episode results.
// Doc: Args: maxiWinner (string[]) - Maxi challenge winners, isSnatchGame (boolean) - Whether episode is Snatch Game, miniWinner (string[]) - Mini challenge winners, topQueens (string[]) - Top placement queens, safeQueens (string[]) - Safe queens, bottomQueens (string[]) - Bottom placement queens, lipSyncWinner (string[]) - Lip sync winners, eliminated (string[]) - Eliminated queens
// Doc: Returns: Record<string, number> - Object mapping queen names to their point changes
const weeklyUpdateObjectHelper = (maxiWinner: string[], isSnatchGame: boolean, miniWinner: string[],
    topQueens: string[], safeQueens: string[], bottomQueens: string[], lipSyncWinner: string[],
    eliminated: string[]
    ) => {
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

        return weeklyQueenScores;
    };

// Doc: Processes weekly episode results and updates all affected rosters' points using a database transaction.
// Doc: Args: franchise (string) - Franchise name, season (number) - Season number, maxiWinner (string[]) - Maxi challenge winners, isSnatchGame (boolean) - Whether episode is Snatch Game, miniWinner (string[]) - Mini challenge winners, topQueens (string[]) - Top placement queens, safeQueens (string[]) - Safe queens, bottomQueens (string[]) - Bottom placement queens, lipSyncWinner (string[]) - Lip sync winners, eliminated (string[]) - Eliminated queens
// Doc: Returns: Promise<Roster[] | null> - Array of updated roster records or null on failure
export const weeklyUpdate = async (franchise: string, season: number, maxiWinner: string[], isSnatchGame: boolean, miniWinner: string[], topQueens: string[],
    safeQueens: string[], bottomQueens: string[], lipSyncWinner: string[], eliminated: string[]) => {
        
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
                logger.error('LeagueOps.Service.ts: rosters cant be null', {error: "weeklyUpdate error"});
                return null;
            }

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
          logger.info(`LeagueOps.Service.ts: failed to update records in weeklyUpdate(): `, {error: error});
          return null;
        }
};

// Doc: Helper function that calculates bonus/penalty points from weekly survey results.
// Doc: Args: toots (string[]) - Queens with good runways, boots (string[]) - Queens with bad runways, iconicQueens (string[]) - Queens with iconic moments, cringeQueens (string[]) - Queens with cringe moments, queenOfTheWeek (string[]) - Queen(s) of the week
// Doc: Returns: Record<string, number> - Object mapping queen names to their point adjustments
const weeklySurveyObjectHelper = (toots: string[], boots: string[], iconicQueens: string[], cringeQueens: string[], queenOfTheWeek: string[]) => {
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
    return update;
};

// Doc: Processes weekly survey results and updates all rosters' points based on bonus/penalty categories.
// Doc: Args: toots (string[]) - Queens with good runways, boots (string[]) - Queens with bad runways, iconicQueens (string[]) - Queens with iconic moments, cringeQueens (string[]) - Queens with cringe moments, queenOfTheWeek (string[]) - Queen(s) of the week
// Doc: Returns: Promise<Roster[] | null> - Array of updated roster records or null on failure
export const weeklySurvey = async (toots: string[], boots: string[], iconicQueens: string[], cringeQueens: string[], queenOfTheWeek: string[]) => {
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
            logger.error("LeagueOps.Service.ts: rosters can't be null!", {error: "weeklySurvey error"});
            return null;
        }
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

        // 4. Remove the corresponding record from the records table too 
        // TODO. 
    }
};

// Doc: TODO: Creates a new roster record (currently not implemented).
// Doc: Args: leagueName (string) - League name, email (string) - User email, teamName (string) - Team name, queens (string[]) - Selected queens, franchise (string) - Franchise name, season (number) - Season number
// Doc: Returns: null - Not yet implemented
export const addNewRoster = (leagueName: string, email: string, teamName: string, queens: string[], franchise: string, season: number) => {
    console.log('TODO: addNewRoster');
    return null;
};

// Doc: Queries the database for all rosters belonging to a specific league.
// Doc: Args: leagueName (string) - The league name to filter by
// Doc: Returns: Promise<Roster[]> - Array of roster records for the specified league
export const getAllRostersByLeague = (leagueName: string) => {
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
    return prisma.roster.findMany();
};

// Doc: Queries the database for all rosters filtered by franchise and season.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<Roster[]> - Array of roster records matching franchise and season
export const getRostersByFranchiseAndLeague = (franchise: string, season: number) => {
    return prisma.roster.findMany({
        where: {
            franchise: franchise,
            season: season,
        },
    });
};
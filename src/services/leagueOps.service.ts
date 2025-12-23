import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

import { getLeague } from "./league.service";
import {League, Roster, User} from '@prisma/client';
import {WeeklyBonusPoints, PointManipulation, QueenStatus, LeaguePointAwards} from '../enums/enums';

// make the weeklyUpdate point updater object //
// goes through the list and determins how many points each queen will gain/lose this week //
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

// performs weekly update //
export const weeklyUpdate = async (maxiWinner: string[], isSnatchGame: boolean, miniWinner: string[], topQueens: string[], 
    safeQueens: string[], bottomQueens: string[], lipSyncWinner: string[], eliminated: string[]) => {
        
        // make weeklyQueenUpdateScores object:
        let weeklyQueenScores = weeklyUpdateObjectHelper(maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated);
        if(!weeklyQueenScores) {
            logger.error('LeagueOps.Service.ts: weeklyQueenScores is null');
            return null;
        }

        // 1. load all records from the Roster column
        try {
            let rosters = await getAllRosters();

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

// gets weekly survey data and adjusts all users with matching fields //
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
    
            // Return the update operation (don't 'await' it yet)
            return prisma.roster.update({
            where: { recordId: roster.recordId },
            data: {
                currentPoints: {
                increment: pointsEarnedThisWeek,
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

export const addUserToLeague = async (email: string, teamName: string, league: League, queens: Array<string>) => {
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
                    teamName: teamName,
                    username: email,
                    queens: queens,
                    currentPoints: 0
                },
            });
        } else {
            console.log('not enough room in array for new user');
            return null;
        }
    }
    else {
        logger.error(`leagueOps.Service.ts: user ${email} already in users of ${league.leagueName}`);
        return null;
    }
};

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

export const addNewRoster = (leagueName: string, email: string, teamName: string, queens: string[]) => {
    console.log('TODO: addNewRoster');
};

// finds all rosters with the leagueName //
export const getAllRostersByLeague = (leagueName: string) => {
    return prisma.roster.findMany({
        where: {
            leagueName: leagueName,
        },
    });
};

export const getAllRosters = () => {
    return prisma.roster.findMany();
};
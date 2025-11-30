import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

import { getLeague } from "./league.service";
import {League, Roster, User} from '@prisma/client';
import {WeeklyBonusPoints, PointManipulation, QueenStatus, LeaguePointAwards} from '../enums/enums';

// helper function to process all the records of people who have the correct maxiWinner(s)
// isSnatchGame passed in because snatch game treated different compared to regular maxiWin
const maxiWinnerHelper = (maxiWinner: Array<string>, isSnatchGame: boolean) => {
    // load all records of users //
    // iterate through all the ones that contain the winning queens //
    // add the enum to their point totals //
    // if isSnatchGame is true, add the correct points //
};

// performs weekly update //
export const weeklyUpdate = (maxiWinner: Array<string>, 
    isSnatchGame: boolean, miniWinner: Array<string>, 
    topQueens: Array<string>, safeQueens: Array<string>, bottomQueens: Array<string>, 
    linSyncWinner: Array<string>, 
    eliminated: Array<string>) => {
        // TODO Implement this. 
        // thought: might want to make separate helper functions to do all of this...
        // 1. load all records from the Roster column
        // 2. Iterate through the records and then update them...
};

// gets weekly survey data and adjusts all users with matching fields //
export const weeklySurvey = (toots: Array<string>, 
    boots: Array<string>, iconicQueens: Array<string>, 
    cringeQueens: Array<string>, queenOfTheWeek: Array<string>) => {
        // TO DO Implement this
        // 1. Get all records from Roster table //
        // 
};

export const addUserToLeague = async (email: string, teamName: string, league: League, queens: Array<string>) => {
    logger.info('leageOps.service.ts: addUserToLeague: ', {email: email, name: league.id});

    // 1. Check to see if user is already registered for this league.
    const isAlreadyInLeague: boolean = league.users.includes(email);

    if(!isAlreadyInLeague) {
        logger.info('leagueOps.Service.ts: User is not already in the league',{});
        // 2. check size of users array, make sure that adding this user won't go over maximum
        if ((league.users.length + 1) <= league.maxPlayers) {
            let updatedPayload = {
                users: {
                    push: email,
                },
            };
            // 3. Update the record for the League table
            logger.info('leagueOps.Service.ts: adding user to the league', {});
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
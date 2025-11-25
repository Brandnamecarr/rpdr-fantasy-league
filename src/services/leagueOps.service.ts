import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

import { getLeague } from "./league.service";
import {League} from '@prisma/client';

// performs weekly update //
export const weeklyUpdate = (weekNumber: number) => {

};

export const addUserToLeague = async (email: string, league: League, queens: Array<string>) => {
    logger.info('leageOps.service.ts: addUserToLeague: ', {email: email, name: league.id});
    console.log('logging the league again below:');
    console.log(league);

    // 1. Check to see if user is already registered for this league.
    const isAlreadyInLeague: boolean = league.users.includes(email);

    if(!isAlreadyInLeague) {
        logger.info('leagueOps.Service.ts: User is not already in the league',{});
        // 2. check size of users array, make sure that adding this user won't go over maximum
        if ((league.users.length + 1) <= league.maxPlayers) {
            console.log('adding user to the users array');
            let updatedPayload = {
                users: {
                    push: email,
                },
            };
            // 3. Update the record for the League table
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

    if(isInUsers) {
        const updatedUsersArray = league.users.filter(league.users.email => League.users.email !== email);
        let updatePayload = {
            users: {
                pop:
            }
        };
    }
};
import prisma from "../db/prisma.client";
import logger from "../util/logger/LoggerImpl";

import { getLeague } from "./league.service";
import { getByFranchiseAndSeason as getQueensByFranchiseAndSeason } from "./queen.service";
import { isOverFreeLeagueLimit } from "./subscription.service";
import * as notificationService from "./notification.service";
import {League, Roster, User, BracketName, Prisma} from '@prisma/client';
import { TalliedEpisodeSurvey } from '../types/Interfaces';
import {WeeklyBonusPoints, PointManipulation, LeaguePointAwards, FanSurveyPoints} from '../enums/enums';
import { QueenStatus, JoinRequestStatus, NotificationType } from "@prisma/client";

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
// Doc: Args: franchise, season, episode - identify the episode; maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated - episode result data; bracketName - optional bracket filter
// Doc: Returns: Promise<Roster[] | null> - Array of updated roster records or null on failure
export const weeklyUpdate = async (franchise: string, season: number, episode: number, maxiWinner: string[], isSnatchGame: boolean, miniWinner: string[], topQueens: string[],
    safeQueens: string[], bottomQueens: string[], lipSyncWinner: string[], eliminated: string[], bracketName?: BracketName) => {
        logger.info('LeagueOps.Service.ts: weeklyUpdate() - processing weekly episode results', {franchise, season, episode, maxiWinner, isSnatchGame, eliminated, bracketName});

        // make weeklyQueenUpdateScores object:
        let weeklyQueenScores = weeklyUpdateObjectHelper(maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated);
        if(!weeklyQueenScores) {
            logger.error('LeagueOps.Service.ts: weeklyQueenScores is null');
            return null;
        }

        // Apply bracket filter when bracketName is supplied
        if (bracketName) {
            const bracket = await prisma.bracket.findFirst({ where: { franchise, season, bracketName } });
            if (!bracket) {
                logger.error('LeagueOps.Service.ts: weeklyUpdate() - bracket not found', {franchise, season, bracketName});
                return null;
            }
            const bracketQueens = new Set(bracket.queens);
            for (const queen of Object.keys(weeklyQueenScores)) {
                if (!bracketQueens.has(queen)) {
                    delete weeklyQueenScores[queen];
                }
            }
            logger.debug('LeagueOps.Service.ts: weeklyUpdate() - applied bracket filter', {bracketName, bracketQueens: bracket.queens.length});
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
        
                const newTotal = Math.max(0, roster.currentPoints + pointsEarnedThisWeek);
                return prisma.roster.update({
                where: { recordId: roster.recordId },
                data: {
                    currentPoints: { set: newTotal },
                    pointUpdates: { push: pointsEarnedThisWeek },
                },
                });
            }); // updatePromises //
        
            // 3. Execute all updates as a single transaction
            // This is much faster and safer than updating one-by-one in a loop
            const results = await prisma.$transaction(updatePromises);

            logger.info(`LeagueOps.Service.ts: Just updated ${results.length} records`);

            await prisma.episodeResult.upsert({
                where: { franchise_season_episode: { franchise, season, episode } },
                create: { franchise, season, episode, maxiWinner, topQueens, eliminated, lipSyncWinner, isSnatchGame },
                update: { maxiWinner, topQueens, eliminated, lipSyncWinner, isSnatchGame },
            });
            logger.info('LeagueOps.Service.ts: weeklyUpdate() - episode result saved', {franchise, season, episode});

            if (eliminated.length > 0) {
                await prisma.queen.updateMany({
                    where: { franchise, season, name: { in: eliminated } },
                    data: { status: QueenStatus.ELIMINATED },
                });
                logger.info('LeagueOps.Service.ts: weeklyUpdate() - marked queens as ELIMINATED in DB', { eliminated });
            }

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
// Doc: Args: franchise, season - scope updates to the correct season; toots, boots, iconicQueens, cringeQueens, queenOfTheWeek - survey results
// Doc: Returns: Promise<Roster[] | null> - Array of updated roster records or null on failure
export const weeklySurvey = async (franchise: string, season: number, toots: string[], boots: string[], iconicQueens: string[], cringeQueens: string[], queenOfTheWeek: string[], bracketName?: BracketName) => {
    logger.info('LeagueOps.Service.ts: weeklySurvey() - processing weekly survey results', {franchise, season, tootCount: toots.length, bootCount: boots.length, queenOfTheWeek});
    //1. Do point adjustments //
    let weeklySurveyUpdate = weeklySurveyObjectHelper(toots, boots, iconicQueens, cringeQueens, queenOfTheWeek);
    if(!weeklySurveyUpdate) {
        logger.error('LeagueOps.Service.ts: weeklySurveyUpdate cant be null');
        return null;
    }

    // Apply bracket filter when bracketName is supplied
    if (bracketName) {
        const bracket = await prisma.bracket.findFirst({ where: { franchise, season, bracketName } });
        if (!bracket) {
            logger.error('LeagueOps.Service.ts: weeklySurvey() - bracket not found', {franchise, season, bracketName});
            return null;
        }
        const bracketQueens = new Set(bracket.queens);
        for (const queen of Object.keys(weeklySurveyUpdate)) {
            if (!bracketQueens.has(queen)) {
                delete weeklySurveyUpdate[queen];
            }
        }
        logger.debug('LeagueOps.Service.ts: weeklySurvey() - applied bracket filter', {bracketName, bracketQueens: bracket.queens.length});
    }

    //2. Load rosters scoped to this franchise+season //
    try {
        let rosters = await getRostersByFranchiseAndLeague(franchise, season);
        if(!rosters) {
            logger.error("LeagueOps.Service.ts: weeklySurvey() - failed to load rosters from database");
            return null;
        }
        logger.debug('LeagueOps.Service.ts: weeklySurvey() - loaded rosters for survey update', {rosterCount: rosters.length});
        // 3. Handle updates //
        const updatePromises = rosters.map((roster) => {
            const pointsEarnedThisWeek = roster.queens.reduce((total, queenName) => {
                return total + (weeklySurveyUpdate[queenName] || 0);
            }, 0);
            return buildMergedPointUpdate(roster, pointsEarnedThisWeek);
        });
    
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

// Returns null if selection is valid, or an error message string if a bracket constraint is violated.
export const validateBracketSelection = async (franchise: string, season: number, queens: string[]): Promise<string | null> => {
    const activeSeason = await prisma.activeSeasons.findFirst({ where: { franchise, season } });
    if (!activeSeason?.isUsingBrackets) return null;

    const brackets = await prisma.bracket.findMany({ where: { franchise, season }, orderBy: { bracketName: 'asc' } });
    for (const bracket of brackets) {
        const count = queens.filter(q => bracket.queens.includes(q)).length;
        if (count !== 2) {
            return `Must select exactly 2 queens from Bracket ${bracket.bracketName} (selected ${count})`;
        }
    }
    return null;
};

// Doc: Adds a user to a league and creates their roster if there's space and they're not already a member.
// Doc: Args: email (string) - User email, teamName (string) - Team name, league (League) - League object to join, queens (Array<string>) - Selected queens, franchise (string) - Franchise name, season (number) - Season number,
// Doc: client (Prisma.TransactionClient | typeof prisma) - optional Prisma client to run these writes against; defaults to the
// Doc: global prisma client, but callers that need this to participate in a larger transaction (e.g. approveJoinRequest below) can pass their `tx`.
// Doc: Returns: Promise<Roster | null> - The created roster record or null if user already in league or league is full
export const addUserToLeague = async (
    email: string, teamName: string, league: League, queens: Array<string>, franchise: string, season: number,
    client: Prisma.TransactionClient | typeof prisma = prisma
) => {
    logger.debug('leagueOps.service.ts: addUserToLeague: ', {email: email, name: league.id});

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
            await client.league.update({
                where: {
                    leagueName: league.leagueName,
                },
                data: updatedPayload,
            });

            // 4. Make a new record in the Roster Table
            return await client.roster.create({
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

        // 4. Remove the corresponding roster record
        await prisma.roster.deleteMany({
            where: { leagueName: league.leagueName, username: email },
        });
        logger.info('LeagueOps.Service.ts: removeUserFromLeague() - roster record deleted', {email, leagueName: league.leagueName});
    } else {
        logger.error('LeagueOps.Service.ts: removeUserFromLeague() - user not found in league users array', {email, leagueName: league.leagueName});
    }
};

// Doc: Creates a pending request for a user to join a league, instead of granting membership
// Doc: immediately (that instant-join behavior lives in addUserToLeague above and is still used
// Doc: once a request is approved). Validates the same preconditions addUserToLeague enforces
// Doc: (not already a member, league not full, free-tier limit) plus a new check: no existing
// Doc: PENDING request for this (leagueName, requester) pair — a prior DENIED request does not block
// Doc: re-requesting. On success, notifies the league owner with a JOIN_REQUEST_RECEIVED notification
// Doc: carrying the new request's id so the frontend can render Approve/Deny actions.
// Doc: Args: email (string) - requester's email, teamName (string), queens (string[]) - selections captured at request time so they're ready to use on approval,
// Doc: league (League) - the league being requested, franchise (string), season (number)
// Doc: Throws: 'ALREADY_MEMBER' | 'LEAGUE_FULL' | 'FREE_TIER_LEAGUE_LIMIT' | 'PENDING_REQUEST_EXISTS'
// Doc: Returns: Promise<LeagueJoinRequest> - the created PENDING request
export const createJoinRequest = async (email: string, teamName: string, queens: Array<string>, league: League, franchise: string, season: number) => {
    logger.info('LeagueOps.Service.ts: createJoinRequest() - request received', {email, leagueName: league.leagueName});

    if (league.users.includes(email)) {
        logger.error('LeagueOps.Service.ts: createJoinRequest() - user already in league', {email, leagueName: league.leagueName});
        throw new Error('ALREADY_MEMBER');
    }

    if ((league.users.length + 1) > league.maxPlayers) {
        logger.error('LeagueOps.Service.ts: createJoinRequest() - league is full', {leagueName: league.leagueName});
        throw new Error('LEAGUE_FULL');
    }

    if (await isOverFreeLeagueLimit(email)) {
        logger.error('LeagueOps.Service.ts: createJoinRequest() - user is over the free-tier league limit', {email});
        throw new Error('FREE_TIER_LEAGUE_LIMIT');
    }

    const existingPending = await prisma.leagueJoinRequest.findFirst({
        where: { leagueName: league.leagueName, requester: email, status: JoinRequestStatus.PENDING },
    });
    if (existingPending) {
        logger.error('LeagueOps.Service.ts: createJoinRequest() - a pending request already exists', {email, leagueName: league.leagueName});
        throw new Error('PENDING_REQUEST_EXISTS');
    }

    const request = await prisma.leagueJoinRequest.create({
        data: {
            leagueName: league.leagueName,
            franchise: franchise,
            season: season,
            requester: email,
            teamName: teamName,
            queens: queens,
            status: JoinRequestStatus.PENDING,
        },
    });

    await notificationService.makeNewNotification(
        'SERVER', league.owner, `${email} has requested to join your league "${league.leagueName}"`,
        NotificationType.JOIN_REQUEST_RECEIVED, request.id,
    );

    logger.info('LeagueOps.Service.ts: createJoinRequest() - request created and owner notified', {requestId: request.id, leagueName: league.leagueName});
    return request;
};

// Doc: Approves a pending LeagueJoinRequest: re-validates capacity/free-tier limits (time has passed
// Doc: since the request was made), then reuses addUserToLeague's mutation (push email onto League.users,
// Doc: create the Roster with the request's teamName/queens) before marking the request APPROVED and
// Doc: notifying the requester. If capacity was exceeded in the meantime, throws without mutating anything.
// Doc: The status claim (`leagueJoinRequest.updateMany` guarded on status === PENDING) plus
// Doc: addUserToLeague's writes all run inside a single `prisma.$transaction` interactive transaction,
// Doc: so two concurrent approve calls for the same request can't both pass the PENDING check and
// Doc: both add the user / create duplicate rosters (TOCTOU fix). The notification is sent after the
// Doc: transaction commits so a notification failure never rolls back a successful approval.
// Doc: Args: requestId (number), requestingEmail (string) - must be the league's owner
// Doc: Throws: 'REQUEST_NOT_FOUND' | 'LEAGUE_NOT_FOUND' | 'NOT_OWNER' | 'REQUEST_NOT_PENDING' | 'FREE_TIER_LEAGUE_LIMIT' | 'LEAGUE_FULL'
// Doc: Returns: Promise<{request: LeagueJoinRequest, roster: Roster}>
export const approveJoinRequest = async (requestId: number, requestingEmail: string) => {
    logger.info('LeagueOps.Service.ts: approveJoinRequest() - request received', {requestId, requestingEmail});

    const request = await prisma.leagueJoinRequest.findUnique({ where: { id: requestId } });
    if (!request) {
        logger.error('LeagueOps.Service.ts: approveJoinRequest() - request not found', {requestId});
        throw new Error('REQUEST_NOT_FOUND');
    }

    const league = await getLeague(request.leagueName, request.franchise, request.season);
    if (!league) {
        logger.error('LeagueOps.Service.ts: approveJoinRequest() - league not found', {requestId, leagueName: request.leagueName});
        throw new Error('LEAGUE_NOT_FOUND');
    }

    if (league.owner !== requestingEmail) {
        logger.error('LeagueOps.Service.ts: approveJoinRequest() - requester is not the owner', {requestingEmail, owner: league.owner});
        throw new Error('NOT_OWNER');
    }

    if (request.status !== JoinRequestStatus.PENDING) {
        logger.error('LeagueOps.Service.ts: approveJoinRequest() - request is not pending', {requestId, status: request.status});
        throw new Error('REQUEST_NOT_PENDING');
    }

    // Doc: Soft pre-check — isOverFreeLeagueLimit doesn't accept a transaction client, and this is a
    // Doc: best-effort validation (not the source of truth against concurrent approvals; the atomic
    // Doc: status claim inside the transaction below is).
    if (await isOverFreeLeagueLimit(request.requester)) {
        logger.error('LeagueOps.Service.ts: approveJoinRequest() - requester is over the free-tier league limit', {requester: request.requester});
        throw new Error('FREE_TIER_LEAGUE_LIMIT');
    }

    const { updatedRequest, roster } = await prisma.$transaction(async (tx) => {
        // Doc: Atomically claim the request — only succeeds if it's still PENDING, closing the race
        // Doc: window between the earlier findUnique check and this write.
        const claim = await tx.leagueJoinRequest.updateMany({
            where: { id: requestId, status: JoinRequestStatus.PENDING },
            data: { status: JoinRequestStatus.APPROVED },
        });
        if (claim.count === 0) {
            logger.error('LeagueOps.Service.ts: approveJoinRequest() - lost the race, request no longer pending', {requestId});
            throw new Error('REQUEST_NOT_PENDING');
        }

        const roster = await addUserToLeague(request.requester, request.teamName, league, request.queens, request.franchise, request.season, tx);
        if (!roster) {
            logger.error('LeagueOps.Service.ts: approveJoinRequest() - unable to add requester to league (full or already a member)', {requestId, leagueName: league.leagueName});
            throw new Error('LEAGUE_FULL');
        }

        const updatedRequest = await tx.leagueJoinRequest.findUniqueOrThrow({ where: { id: requestId } });
        return { updatedRequest, roster };
    });

    await notificationService.makeNewNotification(
        'SERVER', request.requester, `Your request to join "${league.leagueName}" has been approved!`,
        NotificationType.JOIN_REQUEST_APPROVED, request.id,
    );

    logger.info('LeagueOps.Service.ts: approveJoinRequest() - approved and requester notified', {requestId, leagueName: league.leagueName});
    return { request: updatedRequest, roster };
};

// Doc: Denies a pending LeagueJoinRequest. No membership side effects — just marks the request DENIED
// Doc: and notifies the requester. The requester may submit a new request later (only PENDING requests
// Doc: block duplicates, see createJoinRequest above). The status claim runs inside a `prisma.$transaction`
// Doc: (`leagueJoinRequest.updateMany` guarded on status === PENDING) so a concurrent approve/deny call
// Doc: for the same request can't also succeed (TOCTOU fix, mirrors approveJoinRequest above).
// Doc: Args: requestId (number), requestingEmail (string) - must be the league's owner
// Doc: Throws: 'REQUEST_NOT_FOUND' | 'LEAGUE_NOT_FOUND' | 'NOT_OWNER' | 'REQUEST_NOT_PENDING'
// Doc: Returns: Promise<LeagueJoinRequest> - the updated (DENIED) request
export const denyJoinRequest = async (requestId: number, requestingEmail: string) => {
    logger.info('LeagueOps.Service.ts: denyJoinRequest() - request received', {requestId, requestingEmail});

    const request = await prisma.leagueJoinRequest.findUnique({ where: { id: requestId } });
    if (!request) {
        logger.error('LeagueOps.Service.ts: denyJoinRequest() - request not found', {requestId});
        throw new Error('REQUEST_NOT_FOUND');
    }

    const league = await getLeague(request.leagueName, request.franchise, request.season);
    if (!league) {
        logger.error('LeagueOps.Service.ts: denyJoinRequest() - league not found', {requestId, leagueName: request.leagueName});
        throw new Error('LEAGUE_NOT_FOUND');
    }

    if (league.owner !== requestingEmail) {
        logger.error('LeagueOps.Service.ts: denyJoinRequest() - requester is not the owner', {requestingEmail, owner: league.owner});
        throw new Error('NOT_OWNER');
    }

    if (request.status !== JoinRequestStatus.PENDING) {
        logger.error('LeagueOps.Service.ts: denyJoinRequest() - request is not pending', {requestId, status: request.status});
        throw new Error('REQUEST_NOT_PENDING');
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
        const claim = await tx.leagueJoinRequest.updateMany({
            where: { id: requestId, status: JoinRequestStatus.PENDING },
            data: { status: JoinRequestStatus.DENIED },
        });
        if (claim.count === 0) {
            logger.error('LeagueOps.Service.ts: denyJoinRequest() - lost the race, request no longer pending', {requestId});
            throw new Error('REQUEST_NOT_PENDING');
        }
        return tx.leagueJoinRequest.findUniqueOrThrow({ where: { id: requestId } });
    });

    await notificationService.makeNewNotification(
        'SERVER', request.requester, `Your request to join "${league.leagueName}" has been denied.`,
        NotificationType.JOIN_REQUEST_DENIED, request.id,
    );

    logger.info('LeagueOps.Service.ts: denyJoinRequest() - denied and requester notified', {requestId, leagueName: league.leagueName});
    return updatedRequest;
};

// Doc: Returns all PENDING LeagueJoinRequest rows for leagues owned by the given email, used to
// Doc: hydrate the owner's view of outstanding requests (e.g. beyond just their notifications).
// Doc: Args: email (string) - the league owner's email
// Doc: Returns: Promise<LeagueJoinRequest[]>
export const getPendingJoinRequestsForOwner = async (email: string) => {
    logger.debug('LeagueOps.Service.ts: getPendingJoinRequestsForOwner() - fetching pending requests', {email});

    const ownedLeagues = await prisma.league.findMany({
        where: { owner: email },
        select: { leagueName: true, franchise: true, season: true },
    });
    if (ownedLeagues.length === 0) return [];

    return prisma.leagueJoinRequest.findMany({
        where: {
            status: JoinRequestStatus.PENDING,
            OR: ownedLeagues.map(l => ({ leagueName: l.leagueName, franchise: l.franchise, season: l.season })),
        },
        orderBy: { createdAt: 'asc' },
    });
};

// Doc: Increases the maxPlayers cap for a league.
// Doc: Args: leagueName (string) - The league to update, newMaxPlayers (number) - The new maximum player count
// Doc: Returns: Promise<League> - The updated league record
export const increaseLeagueSize = async (leagueName: string, newMaxPlayers: number) => {
    logger.info('LeagueOps.Service.ts: increaseLeagueSize() - updating maxPlayers', {leagueName, newMaxPlayers});
    return prisma.league.update({
        where: { leagueName },
        data: { maxPlayers: newMaxPlayers },
    });
};

// Doc: Queries the database for all rosters belonging to a specific league.
// Doc: Args: leagueName (string) - The league name to filter by
// Doc: Returns: Promise<Roster[]> - Array of roster records for the specified league
// Doc: Falls back to RosterHistory when a league has no live rosters — the case once a season has
// Doc: been archived (see league.service.ts's archiveLeagueSeason()) and its rosters moved out of the
// Doc: live Roster table. RosterHistory rows carry the same field shape as Roster (see schema.prisma),
// Doc: so this is transparent to callers.
export const getAllRostersByLeague = async (leagueName: string) => {
    logger.debug('LeagueOps.Service.ts: getAllRostersByLeague() - fetching rosters for league', {leagueName});
    const liveRosters = await prisma.roster.findMany({
        where: {
            leagueName: leagueName,
        },
    });
    if (liveRosters.length > 0) return liveRosters;

    logger.debug('LeagueOps.Service.ts: getAllRostersByLeague() - no live rosters, checking RosterHistory', {leagueName});
    return prisma.rosterHistory.findMany({
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

// Doc: Creates or updates a FanSurvey record to open a survey window for an episode.
// Doc: Args: franchise, season, episode, startDate, endDate
// Doc: Returns: The upserted FanSurvey record
export const openFanSurvey = async (
    franchise: string, season: number, episode: number, startDate: Date, endDate: Date
) => {
    logger.info('LeagueOps.Service.ts: openFanSurvey() - opening survey', {franchise, season, episode, startDate, endDate});
    return prisma.fanSurvey.upsert({
        where: { franchise_season_episode: { franchise, season, episode } },
        create: { franchise, season, episode, startDate, endDate },
        update: { startDate, endDate },
    });
};

// Doc: Returns open FanSurvey records for the franchise/seasons the user currently participates in,
//      each decorated with a hasVoted flag indicating whether the user has already submitted.
export const getOpenSurveysForUser = async (email: string) => {
    logger.info('LeagueOps.Service.ts: getOpenSurveysForUser() - fetching open surveys', {email});
    const now = new Date();

    const rosters = await prisma.roster.findMany({ where: { username: email }, select: { franchise: true, season: true } });
    if (rosters.length === 0) return [];

    const openSurveys = await prisma.fanSurvey.findMany({
        where: {
            OR: rosters.map(r => ({ franchise: r.franchise, season: r.season })),
            startDate: { lte: now },
            endDate:   { gte: now },
        },
        include: {
            responses: { where: { submittedBy: email }, select: { id: true } },
        },
        orderBy: { episode: 'desc' },
    });

    return openSurveys.map(({ responses, ...survey }) => ({
        ...survey,
        hasVoted: responses.length > 0,
    }));
};

// Doc: Returns all FanSurvey records (open + closed) for the user's franchise/seasons, each decorated with hasVoted.
export const getAllSurveysForUser = async (email: string) => {
    logger.info('LeagueOps.Service.ts: getAllSurveysForUser() - fetching all surveys', {email});
    const now = new Date();

    const rosters = await prisma.roster.findMany({ where: { username: email }, select: { franchise: true, season: true } });
    if (rosters.length === 0) return [];

    const surveys = await prisma.fanSurvey.findMany({
        where: {
            OR: rosters.map(r => ({ franchise: r.franchise, season: r.season })),
            startDate: { lte: now },
        },
        include: {
            responses: { where: { submittedBy: email }, select: { id: true } },
        },
        orderBy: [{ season: 'desc' }, { episode: 'desc' }],
    });

    return surveys.map(({ responses, ...survey }) => ({
        ...survey,
        hasVoted: responses.length > 0,
    }));
};

// Doc: Stores an individual fan survey response after verifying the survey is open and the user participates in that franchise/season.
// Doc: Throws 'SURVEY_NOT_FOUND', 'SURVEY_CLOSED', 'NOT_ELIGIBLE', or a Prisma P2002 for duplicate submissions.
export const submitFanSurvey = async (
    franchise: string, season: number, episode: number, submittedBy: string,
    queenOfTheWeek: string, bottomOfTheWeek: string, lipSyncWinner: string,
    bestDressed: string, worstDressed: string
) => {
    logger.info('LeagueOps.Service.ts: submitFanSurvey() - storing fan survey response', {franchise, season, episode, submittedBy});

    const now = new Date();

    const survey = await prisma.fanSurvey.findUnique({
        where: { franchise_season_episode: { franchise, season, episode } },
    });
    if (!survey) throw new Error('SURVEY_NOT_FOUND');
    if (now < survey.startDate || now > survey.endDate) throw new Error('SURVEY_CLOSED');

    const roster = await prisma.roster.findFirst({ where: { username: submittedBy, franchise, season } });
    if (!roster) throw new Error('NOT_ELIGIBLE');

    return prisma.fanSurveyData.create({
        data: { surveyId: survey.id, franchise, season, episode, submittedBy, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed },
    });
};

// Doc: Builds the Prisma update op that increments currentPoints and merges pointsEarned into
//      the last entry of pointUpdates (survey points share an episode entry with episode points).
const buildMergedPointUpdate = (roster: Roster, pointsEarned: number) => {
    const pointUpdateArray = [...roster.pointUpdates];
    if (pointUpdateArray.length > 0) {
        pointUpdateArray[pointUpdateArray.length - 1] += pointsEarned;
    } else {
        pointUpdateArray.push(pointsEarned);
    }
    const newTotal = Math.max(0, roster.currentPoints + pointsEarned);
    return prisma.roster.update({
        where: { recordId: roster.recordId },
        data: {
            currentPoints: { set: newTotal },
            pointUpdates:  { set: pointUpdateArray },
        },
    });
};

// Doc: Helper — counts votes per queen for a given field and returns all queens tied for the plurality.
const tallyVotes = (responses: { [key: string]: unknown }[], field: string): string[] => {
    const counts: Record<string, number> = {};
    responses.forEach(r => {
        const val = r[field] as string;
        counts[val] = (counts[val] || 0) + 1;
    });
    const maxVotes = Math.max(...Object.values(counts));
    return Object.entries(counts).filter(([, v]) => v === maxVotes).map(([k]) => k);
};

// Doc: Tallies all fan survey responses for an episode, finds the plurality winner(s) per category, and adjusts all roster points accordingly.
// Doc: Awards points to all tied queens in the event of a tie. Safe to call only once — guards via the computed flag on FanSurvey.
// Doc: Args: franchise, season, episode - identify the episode to compute
// Doc: Returns: Promise<Roster[] | null> - Updated roster records, null if no responses/rosters, or 'ALREADY_COMPUTED' string sentinel
export const computeFanSurvey = async (franchise: string, season: number, episode: number, bracketName?: BracketName) => {
    logger.info('LeagueOps.Service.ts: computeFanSurvey() - tallying votes', {franchise, season, episode, bracketName});

    const survey = await prisma.fanSurvey.findUnique({
        where: { franchise_season_episode: { franchise, season, episode } },
    });
    if (survey?.computed) {
        logger.info('LeagueOps.Service.ts: computeFanSurvey() - already computed, skipping', {franchise, season, episode});
        return 'ALREADY_COMPUTED' as const;
    }

    const responses = await prisma.fanSurveyData.findMany({ where: { franchise, season, episode } });
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
    let scores: Record<string, number> = {};
    const addScore = (queens: string[], pts: number) =>
        queens.forEach(q => { scores[q] = (scores[q] || 0) + pts; });

    addScore(queensOfWeek, FanSurveyPoints.QUEEN_OF_WEEK);
    addScore(bottomQueens,  FanSurveyPoints.BOTTOM_OF_WEEK);
    addScore(lipSyncWins,   FanSurveyPoints.LIP_SYNC_WINNER);
    addScore(bestDressed,   FanSurveyPoints.BEST_DRESSED);
    addScore(worstDressed,  FanSurveyPoints.WORST_DRESSED);

    // Apply bracket filter when bracketName is supplied
    if (bracketName) {
        const bracket = await prisma.bracket.findFirst({ where: { franchise, season, bracketName } });
        if (!bracket) {
            logger.error('LeagueOps.Service.ts: computeFanSurvey() - bracket not found', {franchise, season, bracketName});
            return null;
        }
        const bracketQueens = new Set(bracket.queens);
        for (const queen of Object.keys(scores)) {
            if (!bracketQueens.has(queen)) {
                delete scores[queen];
            }
        }
        logger.debug('LeagueOps.Service.ts: computeFanSurvey() - applied bracket filter', {bracketName, bracketQueens: bracket.queens.length});
    }

    try {
        const rosters = await getRostersByFranchiseAndLeague(franchise, season);
        if (!rosters || rosters.length === 0) {
            logger.error('LeagueOps.Service.ts: computeFanSurvey() - no rosters found', {franchise, season});
            return null;
        }

        const updatePromises = rosters.map(roster => {
            const pointsEarned = roster.queens.reduce((total, queenName) =>
                total + (scores[queenName] || 0), 0);
            return buildMergedPointUpdate(roster, pointsEarned);
        });

        const results = await prisma.$transaction(updatePromises);
        logger.info(`LeagueOps.Service.ts: computeFanSurvey() - updated ${results.length} rosters`, {franchise, season, episode});

        if (survey) {
            await prisma.fanSurvey.update({
                where: { id: survey.id },
                data: { computed: true },
            });
            logger.info('LeagueOps.Service.ts: computeFanSurvey() - marked survey as computed', {franchise, season, episode});
        }

        return results;
    } catch (error) {
        logger.error('LeagueOps.Service.ts: computeFanSurvey() - transaction failed', {franchise, season, episode, error});
        return null;
    }
};

// Doc: Stores one season finale survey response per user per season.
// Doc: Args: franchise, season, submittedBy, winner, runnerUp, missCongeniality, bestDressed, fanFavorite, tradeOfTheSeason, mostImproved
// Doc: Returns: Promise<SeasonFinaleResponse> - The created record
export const submitSeasonFinale = async (
    franchise: string, season: number, submittedBy: string,
    winner: string, runnerUp: string, missCongeniality: string,
    bestDressed: string, fanFavorite: string, tradeOfTheSeason: string,
    mostImproved: string
) => {
    logger.info('LeagueOps.Service.ts: submitSeasonFinale() - storing response', {franchise, season, submittedBy});
    return prisma.seasonFinaleResponse.create({
        data: {
            franchise, season, submittedBy,
            winner, runnerUp, missCongeniality,
            bestDressed, fanFavorite, tradeOfTheSeason,
            mostImproved,
        },
    });
};

// Doc: Returns all EpisodeResult records for a franchise/season, ordered by episode ascending.
export const getEpisodeHistory = async (franchise: string, season: number) => {
    logger.info('LeagueOps.Service.ts: getEpisodeHistory() - fetching episode results', {franchise, season});
    return prisma.episodeResult.findMany({
        where: { franchise, season },
        orderBy: { episode: 'asc' },
    });
};

// Doc: Returns backend-tallied fan survey results per episode (plurality winner per category).
// Doc: Only includes episodes whose survey window has closed (endDate in the past).
export const getTalliedFanSurveyResults = async (franchise: string, season: number): Promise<TalliedEpisodeSurvey[]> => {
    logger.info('LeagueOps.Service.ts: getTalliedFanSurveyResults() - tallying fan survey responses', {franchise, season});
    const now = new Date();
    const closedSurveys = await prisma.fanSurvey.findMany({
        where: { franchise, season, endDate: { lt: now } },
        select: { episode: true },
    });
    const closedEpisodes = closedSurveys.map(s => s.episode);
    if (closedEpisodes.length === 0) return [];

    const responses = await prisma.fanSurveyData.findMany({
        where: { franchise, season, episode: { in: closedEpisodes } },
        orderBy: { episode: 'asc' },
    });

    const byEpisode = new Map<number, typeof responses>();
    responses.forEach(r => {
        if (!byEpisode.has(r.episode)) byEpisode.set(r.episode, []);
        byEpisode.get(r.episode)!.push(r);
    });

    return Array.from(byEpisode.entries()).map(([episode, eps]) => ({
        episode,
        queenOfTheWeek:  tallyVotes(eps, 'queenOfTheWeek'),
        bottomOfTheWeek: tallyVotes(eps, 'bottomOfTheWeek'),
        lipSyncWinner:   tallyVotes(eps, 'lipSyncWinner'),
        bestDressed:     tallyVotes(eps, 'bestDressed'),
        worstDressed:    tallyVotes(eps, 'worstDressed'),
    }));
};

// Doc: Tallies all season finale survey responses, finds the plurality winner per category, and awards points to all rosters.
// Doc: Args: franchise, season - the season to compute
// Doc: Returns: Promise<Roster[] | null> - Updated roster records or null if no responses found
export const computeSeasonFinale = async (franchise: string, season: number) => {
    logger.info('LeagueOps.Service.ts: computeSeasonFinale() - tallying votes', {franchise, season});

    const responses = await prisma.seasonFinaleResponse.findMany({ where: { franchise, season } });
    if (responses.length === 0) {
        logger.error('LeagueOps.Service.ts: computeSeasonFinale() - no responses found', {franchise, season});
        return null;
    }

    const winner          = tallyVotes(responses, 'winner');
    const runnerUp        = tallyVotes(responses, 'runnerUp');
    const missCongeniality = tallyVotes(responses, 'missCongeniality');
    const bestDressed     = tallyVotes(responses, 'bestDressed');
    const fanFavorite     = tallyVotes(responses, 'fanFavorite');
    const tradeOfTheSeason = tallyVotes(responses, 'tradeOfTheSeason');
    const mostImproved    = tallyVotes(responses, 'mostImproved');

    logger.info('LeagueOps.Service.ts: computeSeasonFinale() - vote results', {winner, runnerUp, missCongeniality, bestDressed, fanFavorite, tradeOfTheSeason, mostImproved});

    let scores: Record<string, number> = {};
    const addScore = (queens: string[], pts: number) =>
        queens.forEach(q => { scores[q] = (scores[q] || 0) + pts; });

    addScore(winner,           LeaguePointAwards.WINNER);
    addScore(runnerUp,         LeaguePointAwards.RUNNER_UP);
    addScore(missCongeniality, LeaguePointAwards.MISS_CONGENIALITY);
    addScore(bestDressed,      LeaguePointAwards.BEST_DRESSED);
    addScore(fanFavorite,      LeaguePointAwards.FAN_FAVORITE);
    addScore(tradeOfTheSeason, LeaguePointAwards.TRADE_OF_THE_SEASON);
    addScore(mostImproved,     LeaguePointAwards.MOST_IMPROVED);

    try {
        const rosters = await getRostersByFranchiseAndLeague(franchise, season);
        if (!rosters || rosters.length === 0) {
            logger.error('LeagueOps.Service.ts: computeSeasonFinale() - no rosters found', {franchise, season});
            return null;
        }

        const updatePromises = rosters.map(roster => {
            const pointsEarned = roster.queens.reduce((total, queenName) =>
                total + (scores[queenName] || 0), 0);
            return buildMergedPointUpdate(roster, pointsEarned);
        });

        const results = await prisma.$transaction(updatePromises);
        logger.info(`LeagueOps.Service.ts: computeSeasonFinale() - updated ${results.length} rosters`, {franchise, season});
        return results;
    } catch (error) {
        logger.error('LeagueOps.Service.ts: computeSeasonFinale() - transaction failed', {franchise, season, error});
        return null;
    }
};

// Doc: Applies end-of-season league point awards directly to rosters, bypassing the fan survey tally.
// Doc: Every remaining ACTIVE queen not named as winner/runnerUp is treated as eliminated in the finale:
// Doc: they take the standard PointManipulation.ELIMINATED penalty and their DB status flips to ELIMINATED.
// Doc: Winner/runnerUp queens have their status flipped to WINNER/RUNNER_UP. Caller is responsible for
// Doc: setting the season INACTIVE afterward (see activeSeason/updateSeason) — this function does not do it.
// Doc: Award categories beyond winner/runnerUp (e.g. bestDressed, missCongeniality, fanFavorite, tradeOfTheSeason, mostImproved
// Doc: from LeaguePointAwards) can be added as additional optional params later without changing this function's shape.
// Doc: Args: franchise, season, episode - identifies the finale episode being closed out; winner, runnerUp - queen name(s) receiving each award
// Doc: Callers are expected to have already validated that winner/runnerUp are known, currently-ACTIVE queens.
// Doc: Returns: Promise<Roster[] | null> - Updated roster records or null if no rosters found
export const endOfSeasonUpdate = async (
    franchise: string, season: number, episode: number,
    winner: string[], runnerUp: string[]
) => {
    logger.info('LeagueOps.Service.ts: endOfSeasonUpdate() - applying end of season awards', {franchise, season, episode, winner, runnerUp});

    try {
        const rosters = await getRostersByFranchiseAndLeague(franchise, season);
        if (!rosters || rosters.length === 0) {
            logger.error('LeagueOps.Service.ts: endOfSeasonUpdate() - no rosters found', {franchise, season});
            return null;
        }

        const queens = await getQueensByFranchiseAndSeason(franchise, season);
        const namedQueens = new Set([...winner, ...runnerUp]);
        const eliminated = queens
            .filter(q => q.status === QueenStatus.ACTIVE && !namedQueens.has(q.name))
            .map(q => q.name);

        let scores: Record<string, number> = {};
        const addScore = (queenNames: string[], pts: number) =>
            queenNames.forEach(q => { scores[q] = (scores[q] || 0) + pts; });

        addScore(winner,     LeaguePointAwards.WINNER);
        addScore(runnerUp,   LeaguePointAwards.RUNNER_UP);
        addScore(eliminated, PointManipulation.ELIMINATED);

        const updatePromises = rosters.map(roster => {
            const pointsEarned = roster.queens.reduce((total, queenName) =>
                total + (scores[queenName] || 0), 0);
            return buildMergedPointUpdate(roster, pointsEarned);
        });

        const results = await prisma.$transaction(updatePromises);
        logger.info(`LeagueOps.Service.ts: endOfSeasonUpdate() - updated ${results.length} rosters`, {franchise, season, episode});

        if (winner.length > 0) {
            await prisma.queen.updateMany({ where: { franchise, season, name: { in: winner } }, data: { status: QueenStatus.WINNER } });
        }
        if (runnerUp.length > 0) {
            await prisma.queen.updateMany({ where: { franchise, season, name: { in: runnerUp } }, data: { status: QueenStatus.RUNNER_UP } });
        }
        if (eliminated.length > 0) {
            await prisma.queen.updateMany({ where: { franchise, season, name: { in: eliminated } }, data: { status: QueenStatus.ELIMINATED } });
        }
        logger.info('LeagueOps.Service.ts: endOfSeasonUpdate() - queen statuses updated', {franchise, season, winner, runnerUp, eliminated});

        return results;
    } catch (error) {
        logger.error('LeagueOps.Service.ts: endOfSeasonUpdate() - transaction failed', {franchise, season, episode, error});
        return null;
    }
};
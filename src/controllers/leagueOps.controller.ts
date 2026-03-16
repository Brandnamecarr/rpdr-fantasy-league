import { Request, Response } from "express";
import * as leagueOpsService from '../services/leagueOps.service';
import logger from "../util/LoggerImpl";
import * as leagueService from '../services/league.service';

import {League, User, Roster} from '@prisma/client';

// Doc: Processes weekly episode results and updates point totals for all affected rosters.
// Doc: Args: req (Request) - Express request object with body containing {franchise: string, season: number, maxiWinner: string, isSnatchGame: boolean, miniWinner: string, topQueens: string[], safeQueens: string[], bottomQueens: string[], linSyncWinner: string, eliminated: string[]}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/weekly-update
export const weeklyUpdate = async (req: Request, res: Response) => {
    const {franchise, season, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated} = req.body;
    logger.info('LeagueOps.Controller.ts: weeklyUpdate() - request received', {franchise, season, maxiWinner, isSnatchGame, eliminated});

    try {
        const resp = await leagueOpsService.weeklyUpdate(franchise, season, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, linSyncWinner, eliminated);
        if(!resp) {
            logger.error('LeagueOps.Controller.ts: Error in weeklyUpdate(), unable to update points');
            return res.status(404).json({Error: 'Error performing weeklyUpdate operations'});
        }
        logger.info('LeagueOps.Controller.ts: successfully updated point totals, returning 201');
        return res.status(201).json(resp);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: error in weeklyUpdate(): ', {error:error});
        return res.status(500).json({error: 'Error processing weekly update'});
    }
};

// Doc: Processes weekly survey results including toots, boots, iconic/cringe queens, and queen of the week.
// Doc: Args: req (Request) - Express request object with body containing {toots: any[], boots: any[], iconicQueens: any[], cringeQueens: any[], queenOfTheWeek: any}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/weekly-survey
export const weeklySurvey = async (req: Request, res: Response) => {
    const {toots, boots, iconicQueens, cringeQueens, queenOfTheWeek} = req.body;
    logger.info('LeagueOps.Controller.ts: weeklySurvey() - request received', {tootCount: toots?.length, bootCount: boots?.length, queenOfTheWeek});

    try {
        let resp = await leagueOpsService.weeklySurvey(toots, boots, iconicQueens, cringeQueens, queenOfTheWeek);
        if(!resp) {
            logger.error('LeagueOps.Controller.ts: got back null from weeklySurvey, returning 404');
            return res.status(404).json({Error: "Error with weeklySurvey"});
        }
        logger.info('LeagueOps.Controller.ts: successfully performed weeklySurvey update, returning 201');
        return res.status(201).json(resp);
    } catch (error) {
        logger.debug('leagueOps.Controller.ts: Error with Weekly Survey', {error: error});
        return res.status(500).json({error: error});
    }
};

// Doc: Adds a user to an existing league with their team name and selected queens.
// Doc: Args: req (Request) - Express request object with body containing {username: string, teamName: string, leagueName: string, queens: any[], franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/add-user
export const addUserToLeague = async (req: Request, res: Response) => {
    const {username, teamName, leagueName, queens, franchise, season} = req.body;
    logger.debug('LeagueOps.Controller.ts: addUserToLeague() called with: ', {username, teamName, leagueName, franchise, season});
    try {
        const result = await leagueService.getLeague(leagueName, franchise, season);
        if(!result) {
            return res.status(404).json({
                "Error": "League not found in database"
            });
        }
        let league: League = result;
        logger.debug('LeagueOps.Controller.ts: Found league: ', {leagueName: league.leagueName});
        const resp = await leagueOpsService.addUserToLeague(username, teamName, league, queens, league.franchise, league.season);
        if(!resp) {
            return res.status(400).json({Error: `Error adding ${username} to ${leagueName}`});
        }
        res.status(201).json(resp);
    } catch(error) {
        logger.error('LeagueOps.Controller.ts: error in addUserToLeague(): ', {error: error});
        res.status(500).json({error: 'User unable to add to league'});
    }
};

// Doc: Removes a user from an existing league.
// Doc: Args: req (Request) - Express request object with body containing {email: string, leagueName: string, franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely DELETE /league-ops/remove-user or POST /league-ops/remove-user
export const removeUserFromLeague = async (req: Request, res: Response) => {
    const {email, leagueName, franchise, season} = req.body;
    logger.info('LeagueOps.Controller.ts: removeUserFromLeague() - request received', {email, leagueName, franchise, season});
    try {
        const result = await leagueService.getLeague(leagueName, franchise, season);
        if(!result) {
            logger.error('LeagueOps.Controller.ts: removeUserFromLeague() - league not found', {leagueName, franchise, season});
            return res.status(404).json({
                "Error": "League not found in database"
            });
        } //if //
        let league:League = result;
        logger.debug('LeagueOps.Controller.ts: removeUserFromLeague() - found league, calling service', {leagueName: league.leagueName, email});
        const resp = await leagueOpsService.removeUserFromLeague(email, league);
        logger.info('LeagueOps.Controller.ts: removeUserFromLeague() - completed successfully', {email, leagueName});
        res.status(200).json(resp);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: removeUserFromLeague() - unexpected error', {email, leagueName, error});
        res.status(500).json({error: 'Unable to remove user from league'});
    }
};

// Doc: Retrieves all team rosters for a specific league.
// Doc: Args: req (Request) - Express request object with body containing {email: string, token: string, leagueName: string}, res (Response) - Express response object
// Doc: Route: Likely GET /league-ops/rosters/league or POST /league-ops/rosters/league
export const getAllRostersByLeague = async (req: Request, res: Response) => {
    //i think token gets used in the routes file //
    // might not need to pass in //
    const {email, token, leagueName} = req.body;
    logger.debug('LeagueOps.Controller.ts: Finding roster for league: ', {leagueName: leagueName});
    try {
        const result = await leagueOpsService.getAllRostersByLeague(leagueName);
        logger.debug('LeagueOps.Controller.ts: Got back result: ', {result: result});
        if(!result) {
            logger.debug(`LeagueOps.Controller.ts: No rosters found for league ${leagueName}`, {});
            res.status(404).json({"Error": `"No rosters found for league ${leagueName}"`});
        } // if //
        logger.debug('LeagueOps.Controller.ts: Returning 201');
        res.status(201).json(result);
    } // try // 
    catch(error) {
        logger.error('LeagueOps.Controller.ts: error in getAllRostersByLeague: ', {error: error});
        res.status(500).json({
            "Error": {error}
        });
    } // catch //
};

// Doc: Retrieves all rosters from the database (for internal/testing purposes).
// Doc: Args: req (Request) - Express request object, res (Response) - Express response object
// Doc: Route: Likely GET /league-ops/rosters
export const getAllRosters = async (req: Request, res: Response) => {
    logger.debug('LeagueOps.Controller.ts: getAllRosters() - request received');
    try {
        let response = await leagueOpsService.getAllRosters();
        if(!response) {
            logger.error('LeagueOps.Controller.ts: getAllRosters() - no rosters returned from service');
            res.status(404).json({"Error": "No rosters found in database"});
        }
        logger.debug('LeagueOps.Controller.ts: getAllRosters() - returning all rosters', {count: response?.length});
        res.status(201).json(response);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: getAllRosters() - unexpected error', {error: error});
        res.status(500).json({error: error});
    }
};

// Doc: Retrieves all rosters filtered by specific franchise and season.
// Doc: Args: req (Request) - Express request object with query parameters franchise (string) and season (number), res (Response) - Express response object
// Doc: Route: Likely GET /league-ops/rosters?franchise=US&season=16
export const getRostersByFranchiseAndSeason = async (req: Request, res: Response) => {
    const franchise = req.query.franchise as string || undefined;
    const seasonParam = req.query.season;

    const season: number = Number(seasonParam) || -1;

    if(!franchise || season === -1) {
        logger.error(`LeagueOps.Controller.ts: Invalid params ${franchise} or ${seasonParam} in getRosterByFranchiseAndSeason`);
        return res.status(404).json({Error: `Invalid params ${franchise} or ${seasonParam} in getRosterByFranchiseAndSeason`});
    }
    
    try {
        let rosters = await leagueOpsService.getRostersByFranchiseAndLeague(franchise, season);
        if(!rosters) {
            logger.error(`LeagueOps.Controller.ts: Error getting rosters by franchise and season from database`);
            return res.status(404).json({Error: "Error getting rosters from database"});
        }
        logger.debug(`LeagueOps.Controller.ts: got rosters matching franchise and season from table`);
        res.status(201).json(rosters);
    } catch(error) {
        logger.error(`LeagueOps.Controller.ts: Error getting rosters by franchise and season`);
        res.status(500).json({Error: 'Error getting rosters by franchise and season'});
    }
};

// Doc: Stores an individual fan survey response for a specific episode.
// Doc: Body: {franchise, season, episode, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed}
// Doc: Route: POST /leagueOps/submitFanSurvey
export const submitFanSurvey = async (req: Request, res: Response) => {
    const { franchise, season, episode, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed } = req.body;
    const submittedBy = (req as any).user?.email;

    if (!franchise || !season || !episode || !queenOfTheWeek || !bottomOfTheWeek || !lipSyncWinner || !bestDressed || !worstDressed) {
        logger.error('LeagueOps.Controller.ts: submitFanSurvey() - missing required fields');
        return res.status(400).json({ Error: 'All survey fields are required' });
    }

    logger.info('LeagueOps.Controller.ts: submitFanSurvey() - request received', { franchise, season, episode, submittedBy });

    try {
        const resp = await leagueOpsService.submitFanSurvey(
            franchise, Number(season), Number(episode), submittedBy,
            queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed
        );
        logger.info('LeagueOps.Controller.ts: submitFanSurvey() - response stored successfully');
        return res.status(201).json(resp);
    } catch (error: any) {
        if (error?.code === 'P2002') {
            logger.error('LeagueOps.Controller.ts: submitFanSurvey() - duplicate submission', { submittedBy, franchise, season, episode });
            return res.status(409).json({ Error: 'You have already submitted a survey for this episode' });
        }
        logger.error('LeagueOps.Controller.ts: submitFanSurvey() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error submitting fan survey' });
    }
};

// Doc: Tallies fan survey votes for an episode and applies point adjustments to all rosters.
// Doc: Body: {franchise, season, episode} — should only be called after the Friday-Thursday window closes.
// Doc: Route: POST /leagueOps/computeFanSurvey
export const computeFanSurvey = async (req: Request, res: Response) => {
    const { franchise, season, episode } = req.body;

    if (!franchise || !season || !episode) {
        logger.error('LeagueOps.Controller.ts: computeFanSurvey() - missing required fields');
        return res.status(400).json({ Error: 'franchise, season, and episode are required' });
    }

    logger.info('LeagueOps.Controller.ts: computeFanSurvey() - request received', { franchise, season, episode });

    try {
        const resp = await leagueOpsService.computeFanSurvey(franchise, Number(season), Number(episode));
        if (!resp) {
            logger.error('LeagueOps.Controller.ts: computeFanSurvey() - no responses or rosters found');
            return res.status(404).json({ Error: 'No survey responses found for this episode' });
        }
        logger.info('LeagueOps.Controller.ts: computeFanSurvey() - points applied successfully', { updatedRosters: resp.length });
        return res.status(201).json({ updatedRosters: resp.length, rosters: resp });
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: computeFanSurvey() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error computing fan survey results' });
    }
};

// Doc: Increases the maxPlayers cap for a league. Only the league owner may call this.
// Doc: Args: req (Request) - body containing {leagueName, franchise, season, newMaxPlayers}, res (Response)
// Doc: Route: POST /leagueOps/increaseLeagueSize
export const increaseLeagueSize = async (req: Request, res: Response) => {
    const { leagueName, franchise, season, newMaxPlayers } = req.body;
    const requestingEmail = (req as any).user?.email;

    if (!leagueName || !franchise || !season || newMaxPlayers == null) {
        logger.error('LeagueOps.Controller.ts: increaseLeagueSize() - missing required fields');
        return res.status(400).json({ Error: 'leagueName, franchise, season, and newMaxPlayers are required' });
    }

    logger.info('LeagueOps.Controller.ts: increaseLeagueSize() - request received', { leagueName, newMaxPlayers, requestingEmail });

    try {
        const league = await leagueService.getLeague(leagueName, franchise, Number(season));
        if (!league) {
            logger.error('LeagueOps.Controller.ts: increaseLeagueSize() - league not found', { leagueName });
            return res.status(404).json({ Error: 'League not found' });
        }
        if (league.owner !== requestingEmail) {
            logger.error('LeagueOps.Controller.ts: increaseLeagueSize() - requester is not the owner', { requestingEmail, owner: league.owner });
            return res.status(403).json({ Error: 'Only the league owner can increase league size' });
        }
        if (Number(newMaxPlayers) <= league.maxPlayers) {
            logger.error('LeagueOps.Controller.ts: increaseLeagueSize() - new size not greater than current', { current: league.maxPlayers, requested: newMaxPlayers });
            return res.status(400).json({ Error: `New size must be greater than the current limit of ${league.maxPlayers}` });
        }
        const result = await leagueOpsService.increaseLeagueSize(leagueName, Number(newMaxPlayers));
        logger.info('LeagueOps.Controller.ts: increaseLeagueSize() - updated successfully', { leagueName, newMaxPlayers });
        return res.status(200).json(result);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: increaseLeagueSize() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error increasing league size' });
    }
};

// Doc: Creates and adds a new roster record to the database.
// Doc: Args: req (Request) - Express request object with body containing {leagueName: string, email: string, teamName: string, queens: any[], franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/rosters
export const addRoster = async (req: Request, res: Response) => {
    const {leagueName, email, teamName, queens, franchise, season} = req.body;
    try {
        let result = await leagueOpsService.addNewRoster(leagueName, email, teamName, queens, franchise, season);
        if(!result) {
            logger.error('leagueOps.Controller.ts: error adding new roster record into database');
            return res.status(404).json({Error: 'Error making new roster obj in database'});
        }
        logger.debug('leagueOps.Controller.ts: successfully added new record, returning result: ', {result: result});
        res.status(201).json(result);
    } catch(error) {
        logger.error('leagueOps.Controller.ts: addRoster error: ', {error: error});
        res.status(500).json({"Error": error});
    }
};
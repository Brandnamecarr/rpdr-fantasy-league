import { Request, Response } from "express";
import * as leagueOpsService from '../services/leagueOps.service';
import logger from "../util/logger/LoggerImpl";
import * as leagueService from '../services/league.service';
import { isOverFreeLeagueLimit } from '../services/subscription.service';
import { getSeasonRecord, getSurveyWindow } from '../services/activeSeasons.service';
import { AuthRequest } from '../types/CustomRequests';
import {
    WeeklyUpdateBody, WeeklySurveyBody, AddUserToLeagueBody, RemoveUserFromLeagueBody,
    GetRostersByLeagueBody, OpenFanSurveyBody, SubmitFanSurveyBody, ComputeFanSurveyBody,
    SubmitSeasonFinaleBody, IncreaseLeagueSizeBody, RequestToJoinLeagueBody, JoinRequestIdBody, CaughtError,
} from '../types/Interfaces';

import {League, User, Roster} from '@prisma/client';

// Doc: Processes weekly episode results and updates point totals for all affected rosters.
// Doc: Body: {franchise, season, episode, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated, bracketName?}
export const weeklyUpdate = async (req: Request<unknown, unknown, WeeklyUpdateBody>, res: Response) => {
    const {franchise, season, episode, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated, bracketName} = req.body;
    logger.info('LeagueOps.Controller.ts: weeklyUpdate() - request received', {franchise, season, episode, maxiWinner, isSnatchGame, eliminated, bracketName});

    try {
        const resp = await leagueOpsService.weeklyUpdate(franchise, season, episode, maxiWinner, isSnatchGame, miniWinner, topQueens, safeQueens, bottomQueens, lipSyncWinner, eliminated, bracketName);
        if(!resp) {
            logger.error('LeagueOps.Controller.ts: Error in weeklyUpdate(), unable to update points');
            return res.status(404).json({Error: 'Error performing weeklyUpdate operations'});
        }
        logger.info('LeagueOps.Controller.ts: successfully updated point totals, returning 201');
        return res.status(201).json(resp);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: error in weeklyUpdate(): ', {error});
        return res.status(500).json({Error: 'Error processing weekly update'});
    }
};

// Doc: Processes weekly survey results including toots, boots, iconic/cringe queens, and queen of the week.
// Doc: Args: req (Request<unknown, unknown, WeeklySurveyBody>) - Express request object with body containing {toots: string[], boots: string[], iconicQueens: string[], cringeQueens: string[], queenOfTheWeek: string[]}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/weekly-survey
export const weeklySurvey = async (req: Request<unknown, unknown, WeeklySurveyBody>, res: Response) => {
    const {franchise, season, toots, boots, iconicQueens, cringeQueens, queenOfTheWeek, bracketName} = req.body;
    logger.info('LeagueOps.Controller.ts: weeklySurvey() - request received', {franchise, season, tootCount: toots?.length, bootCount: boots?.length, queenOfTheWeek, bracketName});

    if (!franchise || !season) {
        logger.error('LeagueOps.Controller.ts: weeklySurvey() - missing franchise or season');
        return res.status(400).json({ Error: 'franchise and season are required' });
    }

    try {
        let resp = await leagueOpsService.weeklySurvey(franchise, Number(season), toots, boots, iconicQueens, cringeQueens, queenOfTheWeek, bracketName);
        if(!resp) {
            logger.error('LeagueOps.Controller.ts: got back null from weeklySurvey, returning 404');
            return res.status(404).json({Error: "Error with weeklySurvey"});
        }
        logger.info('LeagueOps.Controller.ts: successfully performed weeklySurvey update, returning 201');
        return res.status(201).json(resp);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: Error with Weekly Survey', {error});
        return res.status(500).json({Error: 'Error processing weekly survey'});
    }
};

// Doc: Adds a user to an existing league with their team name and selected queens.
// Doc: Args: req (Request<unknown, unknown, AddUserToLeagueBody>) - Express request object with body containing {username: string, teamName: string, leagueName: string, queens: string[], franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely POST /league-ops/add-user
export const addUserToLeague = async (req: Request<unknown, unknown, AddUserToLeagueBody>, res: Response) => {
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

        // Doc: Free-tier users may only be in (own or join) one league total. Paying members
        // Doc: (hasActiveMembership) are exempt. See subscription.service.ts's isOverFreeLeagueLimit().
        if (await isOverFreeLeagueLimit(username)) {
            logger.error('LeagueOps.Controller.ts: addUserToLeague() - user is over the free-tier league limit', {username, leagueName});
            return res.status(403).json({ Error: 'FREE_TIER_LEAGUE_LIMIT' });
        }

        // Enforce bracket selection constraints when the season uses brackets
        const bracketError = await leagueOpsService.validateBracketSelection(league.franchise, league.season, queens);
        if (bracketError) {
            logger.error('LeagueOps.Controller.ts: addUserToLeague() - bracket validation failed', {bracketError});
            return res.status(400).json({ Error: bracketError });
        }

        const resp = await leagueOpsService.addUserToLeague(username, teamName, league, queens, league.franchise, league.season);
        if(!resp) {
            return res.status(400).json({Error: `Error adding ${username} to ${leagueName}`});
        }
        res.status(201).json(resp);
    } catch(error) {
        logger.error('LeagueOps.Controller.ts: error in addUserToLeague(): ', {error});
        res.status(500).json({Error: 'User unable to add to league'});
    }
};

// Doc: Removes a user from an existing league.
// Doc: Args: req (Request) - Express request object with body containing {email: string, leagueName: string, franchise: string, season: number}, res (Response) - Express response object
// Doc: Route: Likely DELETE /league-ops/remove-user or POST /league-ops/remove-user
export const removeUserFromLeague = async (req: Request<unknown, unknown, RemoveUserFromLeagueBody>, res: Response) => {
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
        res.status(500).json({Error: 'Unable to remove user from league'});
    }
};

// Doc: Retrieves all team rosters for a specific league.
// Doc: Args: req (Request) - Express request object with body containing {email: string, token: string, leagueName: string}, res (Response) - Express response object
// Doc: Route: Likely GET /league-ops/rosters/league or POST /league-ops/rosters/league
export const getAllRostersByLeague = async (req: Request<unknown, unknown, GetRostersByLeagueBody>, res: Response) => {
    const { leagueName } = req.body;
    logger.debug('LeagueOps.Controller.ts: Finding roster for league: ', {leagueName});
    try {
        const result = await leagueOpsService.getAllRostersByLeague(leagueName);
        if(!result) {
            logger.debug(`LeagueOps.Controller.ts: No rosters found for league ${leagueName}`);
            return res.status(404).json({Error: `No rosters found for league ${leagueName}`});
        }
        logger.debug('LeagueOps.Controller.ts: Returning rosters for league', {leagueName, count: result.length});
        res.status(200).json(result);
    } catch(error) {
        logger.error('LeagueOps.Controller.ts: error in getAllRostersByLeague: ', {error});
        res.status(500).json({Error: 'Error fetching rosters for league'});
    }
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
            return res.status(404).json({Error: 'No rosters found in database'});
        }
        logger.debug('LeagueOps.Controller.ts: getAllRosters() - returning all rosters', {count: response.length});
        res.status(200).json(response);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: getAllRosters() - unexpected error', {error});
        res.status(500).json({Error: 'Error fetching all rosters'});
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
        res.status(200).json(rosters);
    } catch(error) {
        logger.error(`LeagueOps.Controller.ts: Error getting rosters by franchise and season`, {error});
        res.status(500).json({Error: 'Error getting rosters by franchise and season'});
    }
};

// Doc: Stores an individual fan survey response for a specific episode.
// Doc: Body: {franchise, season, episode, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed}
// Doc: Opens (or updates) a fan survey window for a franchise/season/episode. Called by the tools after copying episode images.
// Doc: Body: {franchise, season, episode, startDate?, endDate?} — startDate defaults to now, endDate defaults to 7 days from now.
// Doc: Route: POST /leagueOps/openFanSurvey
export const openFanSurvey = async (req: Request<unknown, unknown, OpenFanSurveyBody>, res: Response) => {
    const { franchise, season, episode, startDate, endDate } = req.body;

    if (!franchise || !season || !episode) {
        logger.error('LeagueOps.Controller.ts: openFanSurvey() - missing required fields');
        return res.status(400).json({ Error: 'franchise, season, and episode are required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end   = endDate   ? new Date(endDate)   : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    logger.info('LeagueOps.Controller.ts: openFanSurvey() - request received', { franchise, season, episode, start, end });

    try {
        const survey = await leagueOpsService.openFanSurvey(franchise, Number(season), Number(episode), start, end);
        return res.status(200).json(survey);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: openFanSurvey() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error opening fan survey' });
    }
};

// Doc: Returns all currently-open fan surveys for which the requesting user has a roster (i.e., is participating).
// Doc: Each record includes a hasVoted flag.
// Doc: Route: GET /leagueOps/getOpenSurveys
export const getOpenSurveys = async (req: AuthRequest, res: Response) => {
    const email = req.user!.email;

    logger.info('LeagueOps.Controller.ts: getOpenSurveys() - request received', { email });

    try {
        const surveys = await leagueOpsService.getOpenSurveysForUser(email);
        return res.status(200).json(surveys);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: getOpenSurveys() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error fetching open surveys' });
    }
};

// Doc: Returns all surveys (open + closed) for the authenticated user's franchise/seasons.
// Doc: Route: GET /leagueOps/getAllSurveys
export const getAllSurveys = async (req: AuthRequest, res: Response) => {
    const email = req.user!.email;
    logger.info('LeagueOps.Controller.ts: getAllSurveys() - request received', { email });
    try {
        const surveys = await leagueOpsService.getAllSurveysForUser(email);
        return res.status(200).json(surveys);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: getAllSurveys() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error fetching surveys' });
    }
};

// Doc: Route: POST /leagueOps/submitFanSurvey
export const submitFanSurvey = async (req: AuthRequest<SubmitFanSurveyBody>, res: Response) => {
    const { franchise, season, episode, queenOfTheWeek, bottomOfTheWeek, lipSyncWinner, bestDressed, worstDressed } = req.body;
    const submittedBy = req.user!.email;

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
    } catch (error) {
        const err = error as CaughtError;
        if (err?.message === 'SURVEY_NOT_FOUND') {
            return res.status(404).json({ Error: 'No survey is open for this episode' });
        }
        if (err?.message === 'SURVEY_CLOSED') {
            return res.status(403).json({ Error: 'The survey window for this episode is closed' });
        }
        if (err?.message === 'NOT_ELIGIBLE') {
            return res.status(403).json({ Error: 'You are not participating in a league for this franchise and season' });
        }
        if (err?.code === 'P2002') {
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
export const computeFanSurvey = async (req: Request<unknown, unknown, ComputeFanSurveyBody>, res: Response) => {
    const { franchise, season, episode, bracketName } = req.body;

    if (!franchise || !season || !episode) {
        logger.error('LeagueOps.Controller.ts: computeFanSurvey() - missing required fields');
        return res.status(400).json({ Error: 'franchise, season, and episode are required' });
    }

    logger.info('LeagueOps.Controller.ts: computeFanSurvey() - request received', { franchise, season, episode, bracketName });

    try {
        const resp = await leagueOpsService.computeFanSurvey(franchise, Number(season), Number(episode), bracketName);
        if (resp === 'ALREADY_COMPUTED') {
            logger.info('LeagueOps.Controller.ts: computeFanSurvey() - survey already computed', { franchise, season, episode });
            return res.status(200).json({ message: 'Survey results already computed for this episode' });
        }
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

// Doc: Stores one season finale survey response per user per season.
// Doc: Body: {franchise, season, winner, runnerUp, missCongeniality, bestDressed, fanFavorite, tradeOfTheSeason, mostImproved, snatcGameMvp}
// Doc: Route: POST /leagueOps/submitSeasonFinale
export const submitSeasonFinale = async (req: AuthRequest<SubmitSeasonFinaleBody>, res: Response) => {
    const { franchise, season, winner, runnerUp, missCongeniality, bestDressed, fanFavorite, tradeOfTheSeason, mostImproved } = req.body;
    const submittedBy = req.user!.email;

    if (!franchise || !season || !winner || !runnerUp || !missCongeniality || !bestDressed || !fanFavorite || !tradeOfTheSeason || !mostImproved) {
        logger.error('LeagueOps.Controller.ts: submitSeasonFinale() - missing required fields');
        return res.status(400).json({ Error: 'All survey fields are required' });
    }

    logger.info('LeagueOps.Controller.ts: submitSeasonFinale() - request received', { franchise, season, submittedBy });

    try {
        const seasonRecord = await getSeasonRecord(franchise, Number(season));
        const window = getSurveyWindow(seasonRecord?.endDate);
        if (window) {
            const now = new Date();
            if (now < window.opensAt || now > window.closesAt) {
                logger.error('LeagueOps.Controller.ts: submitSeasonFinale() - outside survey window', { franchise, season, now, window });
                return res.status(403).json({ Error: 'The Season Finale Survey is not currently open for this season' });
            }
        }

        const resp = await leagueOpsService.submitSeasonFinale(
            franchise, Number(season), submittedBy,
            winner, runnerUp, missCongeniality,
            bestDressed, fanFavorite, tradeOfTheSeason,
            mostImproved
        );
        logger.info('LeagueOps.Controller.ts: submitSeasonFinale() - response stored successfully');
        return res.status(201).json(resp);
    } catch (error) {
        if ((error as CaughtError)?.code === 'P2002') {
            logger.error('LeagueOps.Controller.ts: submitSeasonFinale() - duplicate submission', { submittedBy, franchise, season });
            return res.status(409).json({ Error: 'You have already submitted a finale survey for this season' });
        }
        logger.error('LeagueOps.Controller.ts: submitSeasonFinale() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error submitting season finale survey' });
    }
};

// Doc: Returns all EpisodeResult records for a franchise/season, ordered by episode.
// Doc: Query: ?franchise=&season=
export const getEpisodeHistory = async (req: Request, res: Response) => {
    const { franchise, season } = req.query;
    if (!franchise || !season) {
        return res.status(400).json({ Error: 'franchise and season are required' });
    }
    try {
        const results = await leagueOpsService.getEpisodeHistory(String(franchise), Number(season));
        return res.status(200).json(results);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: getEpisodeHistory() - error', { error });
        return res.status(500).json({ Error: 'Error fetching episode history' });
    }
};

// Doc: Returns backend-tallied fan survey results per episode (plurality winner per category).
// Doc: Query: ?franchise=&season=
export const getTalliedFanSurveyResults = async (req: Request, res: Response) => {
    const { franchise, season } = req.query;
    if (!franchise || !season) {
        return res.status(400).json({ Error: 'franchise and season are required' });
    }
    try {
        const results = await leagueOpsService.getTalliedFanSurveyResults(String(franchise), Number(season));
        return res.status(200).json(results);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: getTalliedFanSurveyResults() - error', { error });
        return res.status(500).json({ Error: 'Error fetching fan survey results' });
    }
};

// Doc: Requests to join an existing league — no longer grants membership immediately. Creates a
// Doc: PENDING LeagueJoinRequest and notifies the league owner, who must approve/deny it.
// Doc: Args: req (AuthRequest<RequestToJoinLeagueBody>) - body {leagueName, franchise, season, teamName, queens}, requestingEmail from the JWT
// Doc: Route: POST /leagueOps/requestToJoinLeague
export const requestToJoinLeague = async (req: AuthRequest<RequestToJoinLeagueBody>, res: Response) => {
    const { leagueName, franchise, season, teamName, queens } = req.body;
    const requestingEmail = req.user!.email;
    logger.info('LeagueOps.Controller.ts: requestToJoinLeague() - request received', { leagueName, franchise, season, requestingEmail });

    try {
        const league = await leagueService.getLeague(leagueName, franchise, Number(season));
        if (!league) {
            logger.error('LeagueOps.Controller.ts: requestToJoinLeague() - league not found', { leagueName, franchise, season });
            return res.status(404).json({ Error: 'League not found in database' });
        }

        const bracketError = await leagueOpsService.validateBracketSelection(league.franchise, league.season, queens);
        if (bracketError) {
            logger.error('LeagueOps.Controller.ts: requestToJoinLeague() - bracket validation failed', { bracketError });
            return res.status(400).json({ Error: bracketError });
        }

        const result = await leagueOpsService.createJoinRequest(requestingEmail, teamName, queens, league, league.franchise, league.season);
        logger.info('LeagueOps.Controller.ts: requestToJoinLeague() - request created successfully', { requestId: result.id });
        return res.status(201).json(result);
    } catch (error) {
        const err = error as CaughtError;
        if (err?.message === 'ALREADY_MEMBER') {
            return res.status(409).json({ Error: 'You are already a member of this league' });
        }
        if (err?.message === 'LEAGUE_FULL') {
            return res.status(409).json({ Error: 'This league is full' });
        }
        if (err?.message === 'FREE_TIER_LEAGUE_LIMIT') {
            return res.status(403).json({ Error: 'FREE_TIER_LEAGUE_LIMIT' });
        }
        if (err?.message === 'PENDING_REQUEST_EXISTS') {
            return res.status(409).json({ Error: 'You already have a pending request to join this league' });
        }
        logger.error('LeagueOps.Controller.ts: requestToJoinLeague() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error requesting to join league' });
    }
};

// Doc: Approves a pending join request. Only the league owner may call this.
// Doc: Args: req (AuthRequest<JoinRequestIdBody>) - body {requestId}, requestingEmail from the JWT
// Doc: Route: POST /leagueOps/approveJoinRequest
export const approveJoinRequest = async (req: AuthRequest<JoinRequestIdBody>, res: Response) => {
    const { requestId } = req.body;
    const requestingEmail = req.user!.email;
    logger.info('LeagueOps.Controller.ts: approveJoinRequest() - request received', { requestId, requestingEmail });

    try {
        const result = await leagueOpsService.approveJoinRequest(Number(requestId), requestingEmail);
        logger.info('LeagueOps.Controller.ts: approveJoinRequest() - approved successfully', { requestId });
        return res.status(200).json(result);
    } catch (error) {
        const err = error as CaughtError;
        if (err?.message === 'REQUEST_NOT_FOUND' || err?.message === 'LEAGUE_NOT_FOUND') {
            return res.status(404).json({ Error: 'Join request not found' });
        }
        if (err?.message === 'NOT_OWNER') {
            return res.status(403).json({ Error: 'Only the league owner can approve join requests' });
        }
        if (err?.message === 'REQUEST_NOT_PENDING') {
            return res.status(409).json({ Error: 'This request has already been resolved' });
        }
        if (err?.message === 'FREE_TIER_LEAGUE_LIMIT') {
            return res.status(403).json({ Error: 'FREE_TIER_LEAGUE_LIMIT' });
        }
        if (err?.message === 'LEAGUE_FULL') {
            return res.status(409).json({ Error: 'This league is full' });
        }
        logger.error('LeagueOps.Controller.ts: approveJoinRequest() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error approving join request' });
    }
};

// Doc: Denies a pending join request. Only the league owner may call this. No membership side effects.
// Doc: Args: req (AuthRequest<JoinRequestIdBody>) - body {requestId}, requestingEmail from the JWT
// Doc: Route: POST /leagueOps/denyJoinRequest
export const denyJoinRequest = async (req: AuthRequest<JoinRequestIdBody>, res: Response) => {
    const { requestId } = req.body;
    const requestingEmail = req.user!.email;
    logger.info('LeagueOps.Controller.ts: denyJoinRequest() - request received', { requestId, requestingEmail });

    try {
        const result = await leagueOpsService.denyJoinRequest(Number(requestId), requestingEmail);
        logger.info('LeagueOps.Controller.ts: denyJoinRequest() - denied successfully', { requestId });
        return res.status(200).json(result);
    } catch (error) {
        const err = error as CaughtError;
        if (err?.message === 'REQUEST_NOT_FOUND' || err?.message === 'LEAGUE_NOT_FOUND') {
            return res.status(404).json({ Error: 'Join request not found' });
        }
        if (err?.message === 'NOT_OWNER') {
            return res.status(403).json({ Error: 'Only the league owner can deny join requests' });
        }
        if (err?.message === 'REQUEST_NOT_PENDING') {
            return res.status(409).json({ Error: 'This request has already been resolved' });
        }
        logger.error('LeagueOps.Controller.ts: denyJoinRequest() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error denying join request' });
    }
};

// Doc: Returns all PENDING join requests for leagues owned by the authenticated user.
// Doc: Args: req (AuthRequest) - body {} (owner inferred from JWT)
// Doc: Route: POST /leagueOps/getPendingJoinRequests
export const getPendingJoinRequests = async (req: AuthRequest, res: Response) => {
    const email = req.user!.email;
    logger.info('LeagueOps.Controller.ts: getPendingJoinRequests() - request received', { email });

    try {
        const requests = await leagueOpsService.getPendingJoinRequestsForOwner(email);
        return res.status(200).json(requests);
    } catch (error) {
        logger.error('LeagueOps.Controller.ts: getPendingJoinRequests() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error fetching pending join requests' });
    }
};

// Doc: Increases the maxPlayers cap for a league. Only the league owner may call this.
// Doc: Args: req (Request) - body containing {leagueName, franchise, season, newMaxPlayers}, res (Response)
// Doc: Route: POST /leagueOps/increaseLeagueSize
export const increaseLeagueSize = async (req: AuthRequest<IncreaseLeagueSizeBody>, res: Response) => {
    const { leagueName, franchise, season, newMaxPlayers } = req.body;
    const requestingEmail = req.user!.email;

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


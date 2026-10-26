import prisma from "../db/prisma.client";
import logger from "../util/logger/LoggerImpl";

// Doc: Queries the database for a specific league by name, franchise, and season.
// Doc: Args: leaguename (string) - The league name, franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<League | null> - The league record or null if not found
export const getLeague = (leaguename: string, franchise: string, season: number) => {
    logger.debug('League.Service.ts: getting league with leaguename: ', {leagueName: leaguename, franchise: franchise, season: season});
    return prisma.league.findFirst({
        where: {
            leagueName: leaguename,
            franchise: franchise,
            season: season,
        },
    });  
};

// Doc: Helper function that creates a new roster record in the database.
// Doc: Args: leagueName (string) - League name, franchise (string) - Franchise name, season (number) - Season number, teamName (string) - Team name, email (string) - User email, queens (string[]) - Array of queen names
// Doc: Returns: Promise<Roster> - The created roster record
const makeNewRoster = async (leagueName: string, franchise: string, season: number,
    teamName: string, email: string, queens: string[]
) => {
    logger.debug('League.Service.ts: makeNewRoster() - creating owner roster record', {leagueName, franchise, season, teamName, email, queensCount: queens.length});
    return await prisma.roster.create({
        data: {
            leagueName:leagueName,
            franchise: franchise,
            season: season,
            teamName: teamName,
            username: email,
            queens: queens,
            currentPoints: 0
        },
    });
};

// Doc: Queries the database for all league records.
// Doc: Args: None
// Doc: Returns: Promise<League[]> - Array of all league records
export const getAllLeagues = () => {
    logger.debug('League.Service.ts: loading all league records');
    return prisma.league.findMany();
};

// Doc: Creates a new league in the database and creates a roster for the owner.
// Doc: Args: leaguename (string) - League name, owner (string) - Owner email, users (Array<string>) - Array of user emails, maxPlayers (number) - Max players allowed, maxQueensPerTeam (number) - Max queens per team, franchise (string) - Franchise name, season (number) - Season number, teamName (string) - Owner's team name, queens (string[]) - Owner's selected queens
// Doc: Returns: Promise<League | null> - The created league record or null on failure
export const createLeague = async (leaguename: string, owner: string, users: Array<string>, maxPlayers: number, maxQueensPerTeam: number, franchise: string, season: number, teamName: string, queens: string[]) => {
    logger.debug('League.Service.ts: creatingLeague with name: ', {leaguename, owner, users, maxPlayers, maxQueensPerTeam});

    const newLeague = await prisma.$transaction(async (tx) => {
        const league = await tx.league.create({
            data: {
                leagueName: leaguename,
                owner,
                users,
                maxPlayers,
                maxQueensPerTeam,
                franchise,
                season,
            },
        });

        await tx.roster.create({
            data: {
                leagueName: leaguename,
                franchise,
                season,
                teamName,
                username: owner,
                queens,
                currentPoints: 0,
            },
        });

        return league;
    });

    logger.info('League.Service.ts: createLeague() - league and owner roster created successfully', {leaguename, owner, franchise, season});
    return newLeague;
};

// Doc: Deletes a league and every roster associated with it. leagueName is not a Prisma FK
// Doc: relation to Roster (tables are linked only by matching the leagueName string), so
// Doc: cleanup is manual — done in a transaction alongside the league delete so the two
// Doc: can't partially apply.
// Doc: Args: leagueName (string) - The league's unique name
// Doc: Returns: Promise<{ league: League; deletedRosters: number } | null> - The deleted league + roster count, or null if the league doesn't exist
export const deleteLeague = async (leagueName: string) => {
    logger.debug('League.Service.ts: deleteLeague() - deleting league and its rosters', {leagueName});

    const existing = await prisma.league.findUnique({ where: { leagueName } });
    if (!existing) return null;

    const [{ count: deletedRosters }, league] = await prisma.$transaction([
        prisma.roster.deleteMany({ where: { leagueName } }),
        prisma.league.delete({ where: { leagueName } }),
    ]);

    logger.info('League.Service.ts: deleteLeague() - league and rosters deleted', {leagueName, deletedRosters});
    return { league, deletedRosters };
};

// Doc: Queries the database for all leagues where the user is a member.
// Doc: Args: email (string) - The user's email address
// Doc: Returns: Promise<League[]> - Array of leagues the user is part of (returns id, leagueName, franchise, season)
export const getLeaguesByUser = (email: string) => {
    logger.debug('League.Service.ts: getLeaguesByUser() - fetching leagues for user', {email});
    return prisma.league.findMany({
        where: {
            users: {
                has: email,
            },
        },
        select: {
            id: true,
            leagueName: true,
            franchise: true,
            season: true,
        },
    });
};

// Doc: Queries all leagues and filters for those with available spots (users.length < maxPlayers).
// Doc: Args: None
// Doc: Returns: Promise<League[]> - Array of leagues that can accept more players
export const getAvailableLeagues = async () => {
    logger.debug('League.Service.ts: about to get all leagues', {});

    const allLeagues = await prisma.league.findMany({
        select: {
            id: true,
            owner: true,
            leagueName: true,
            users: true,
            maxPlayers: true,
            franchise: true,
            season: true,
        },
    });

    const availableLeagues = allLeagues.filter(league => {
        return league.users.length < league.maxPlayers;
    });

    logger.debug('League.Service.ts: getAvailableLeagues() - filtered available leagues', {total: allLeagues.length, available: availableLeagues.length});
    return availableLeagues;
};

// Doc: Queries LeagueHistory for every archived league the user was a part of. A league only ever
// Doc: lands in LeagueHistory once its season has been archived (see archiveLeagueSeason() below),
// Doc: so this is "the user's past leagues" by construction — no live-table cross-referencing needed.
// Doc: Args: email (string) - The user's email address
// Doc: Returns: Promise<LeagueHistory[]> - Array of the user's archived leagues
export const getInactiveLeaguesByUser = async (email: string) => {
    logger.debug('League.Service.ts: getInactiveLeaguesByUser() - fetching archived leagues for user', {email});

    return prisma.leagueHistory.findMany({
        where: { users: { has: email } },
    });
};

// Doc: Moves every League/Roster row for a franchise+season into LeagueHistory/RosterHistory, then
// Doc: deletes them from the live tables. Rosters are queried by franchise+season directly (not per
// Doc: league by leagueName) since Roster already carries its own franchise/season and a franchise+
// Doc: season can have many leagues. Idempotent: if nothing is live for that franchise+season (already
// Doc: archived, or there was never anything there), it's a no-op — safe to call more than once, which
// Doc: matters because its caller (activeSeasons.service.ts's updateSeason()) can itself be called
// Doc: more than once with the same status. Also discards that franchise/season's fan surveys
// Doc: (FanSurvey + FanSurveyData) — unlike leagues/rosters they aren't preserved anywhere, since once
// Doc: a season is over there's no "previous surveys" view that needs them. FanSurveyData is deleted
// Doc: before FanSurvey since it's the one real FK relation in this schema.
// Doc: Args: franchise (string), season (number)
// Doc: Returns: Promise<{ archivedLeagues: number; archivedRosters: number }>
export const archiveLeagueSeason = async (franchise: string, season: number) => {
    logger.debug('League.Service.ts: archiveLeagueSeason() - archiving leagues and rosters', {franchise, season});

    const [leagues, rosters] = await Promise.all([
        prisma.league.findMany({ where: { franchise, season } }),
        prisma.roster.findMany({ where: { franchise, season } }),
    ]);

    if (leagues.length === 0 && rosters.length === 0) {
        logger.debug('League.Service.ts: archiveLeagueSeason() - nothing to archive', {franchise, season});
        return { archivedLeagues: 0, archivedRosters: 0 };
    }

    const leagueHistoryRows = leagues.map(l => ({
        originalLeagueId: l.id,
        leagueName: l.leagueName,
        franchise: l.franchise,
        season: l.season,
        owner: l.owner,
        users: l.users,
        maxPlayers: l.maxPlayers,
        maxQueensPerTeam: l.maxQueensPerTeam,
        createdAt: l.createdAt,
    }));
    const rosterHistoryRows = rosters.map(r => ({
        originalRecordId: r.recordId,
        leagueName: r.leagueName,
        username: r.username,
        teamName: r.teamName,
        franchise: r.franchise,
        season: r.season,
        queens: r.queens,
        currentPoints: r.currentPoints,
        pointUpdates: r.pointUpdates,
    }));

    const [{ count: archivedLeagues }, { count: archivedRosters }] = await prisma.$transaction([
        prisma.leagueHistory.createMany({ data: leagueHistoryRows }),
        prisma.rosterHistory.createMany({ data: rosterHistoryRows }),
        prisma.league.deleteMany({ where: { franchise, season } }),
        prisma.roster.deleteMany({ where: { franchise, season } }),
        prisma.fanSurveyData.deleteMany({ where: { franchise, season } }),
        prisma.fanSurvey.deleteMany({ where: { franchise, season } }),
    ]);

    logger.info('League.Service.ts: archiveLeagueSeason() - archived and cleared live tables', {franchise, season, archivedLeagues, archivedRosters});
    return { archivedLeagues, archivedRosters };
};

// Doc: Queries every league in a franchise/season, regardless of available spots.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<League[]> - All league records matching franchise and season
export const getLeaguesByFranchiseAndSeason = (franchise: string, season: number) => {
    logger.debug('League.Service.ts: getLeaguesByFranchiseAndSeason() - fetching leagues', {franchise, season});
    return prisma.league.findMany({
        where: { franchise, season },
    });
};

// Doc: Queries leagues by franchise and season, then filters for those with available spots.
// Doc: Args: franchise (string) - The franchise name, season (number) - The season number
// Doc: Returns: Promise<League[]> - Array of available leagues matching franchise and season
export const getAvailByFranAndSeason = async (franchise: string, season: number) => {
    logger.debug('League.Service.ts: getAvailByFranAndSeason() - fetching available leagues', {franchise, season});
    const allLeagues = await prisma.league.findMany({
        where: {
            franchise: franchise,
            season: season,
        },
    }); // load all leagues in franchise and season //

    const availableLeagues = allLeagues.filter(league => {
        return league.users.length < league.maxPlayers;
    });

    logger.debug('League.Service.ts: getAvailByFranAndSeason() - filtered results', {franchise, season, total: allLeagues.length, available: availableLeagues.length});
    return availableLeagues;
};
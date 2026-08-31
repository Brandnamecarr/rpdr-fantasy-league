import prisma from "../../db/prisma.client";
import logger from "../logger/LoggerImpl";
import { computeFanSurvey } from "../../services/leagueOps.service";

const INTERVAL_MS = 10 * 60 * 1000; // run every 10 minutes

async function computeClosedSurveys(): Promise<void> {
    const now = new Date();
    const closedUncomputed = await prisma.fanSurvey.findMany({
        where: { endDate: { lt: now }, computed: false },
        select: { franchise: true, season: true, episode: true },
    });

    if (closedUncomputed.length === 0) return;

    logger.info(`SurveyScheduler: found ${closedUncomputed.length} uncomputed closed survey(s)`);

    for (const { franchise, season, episode } of closedUncomputed) {
        try {
            const result = await computeFanSurvey(franchise, season, episode);
            if (result === 'ALREADY_COMPUTED') {
                logger.info('SurveyScheduler: already computed (race condition guard)', { franchise, season, episode });
            } else if (result === null) {
                logger.info('SurveyScheduler: no responses found, skipping', { franchise, season, episode });
            } else {
                logger.info(`SurveyScheduler: computed survey — updated ${result.length} roster(s)`, { franchise, season, episode });
            }
        } catch (err) {
            logger.error('SurveyScheduler: error computing survey', { franchise, season, episode, err });
        }
    }
}

export function startSurveyScheduler(): void {
    logger.info(`SurveyScheduler: starting — will check for closed surveys every ${INTERVAL_MS / 60000} minutes`);
    // Run once on startup to catch any surveys that closed while the server was down
    computeClosedSurveys().catch(err =>
        logger.error('SurveyScheduler: startup check failed', { err })
    );
    setInterval(() => {
        computeClosedSurveys().catch(err =>
            logger.error('SurveyScheduler: interval check failed', { err })
        );
    }, INTERVAL_MS);
}

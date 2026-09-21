import prisma from "../db/prisma.client";
import logger from "../util/logger/LoggerImpl";

// Doc: Today's date as a UTC calendar string ("YYYY-MM-DD"), the granularity SiteVisit rows are bucketed by.
const todayUtc = (): string => new Date().toISOString().slice(0, 10);

// Doc: Records that `ip` was seen today. Upserts on the (ip, visitDate) unique key, so calling
// Doc: this repeatedly for the same visitor/day is a no-op after the first call — a count of rows for a
// Doc: date is already the unique-visitor count.
// Doc: Args: ip (string) - The visiting client's IP (from req.ip)
// Doc: Returns: Promise<void> - Never throws; failures are logged and swallowed since this must not
// Doc: break the request it's piggybacking on.
export const recordVisit = async (ip: string): Promise<void> => {
    const visitDate = todayUtc();
    try {
        await prisma.siteVisit.upsert({
            where: { ip_visitDate: { ip, visitDate } },
            create: { ip, visitDate },
            update: {},
        });
    } catch (error) {
        logger.error('SiteVisit.Service.ts: recordVisit() - failed to record visit', { ip, visitDate, error });
    }
};

// Doc: Returns the number of unique visitors recorded for a given UTC date (default: today).
// Doc: Args: visitDate (string?) - "YYYY-MM-DD", defaults to today
// Doc: Returns: Promise<number> - Count of distinct IPs that visited on that date
export const getDailyVisitorCount = async (visitDate: string = todayUtc()): Promise<number> => {
    return prisma.siteVisit.count({ where: { visitDate } });
};

// Doc: Returns unique-visitor counts for the last `days` UTC calendar days (oldest first), including today.
// Doc: Args: days (number) - How many days back to include (default 7)
// Doc: Returns: Promise<{ date: string; count: number }[]>
export const getRecentDailyVisitorCounts = async (days: number = 7): Promise<{ date: string; count: number }[]> => {
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        dates.push(d.toISOString().slice(0, 10));
    }

    const counts = await Promise.all(dates.map(date => getDailyVisitorCount(date)));
    return dates.map((date, i) => ({ date, count: counts[i] }));
};

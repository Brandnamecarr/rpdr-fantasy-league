// Doc: Reads and filters server log entries from logs/app.log for the admin log viewer.
import * as fs from 'fs';
import * as path from 'path';
import logger from '../util/logger/LoggerImpl';
import * as INTERFACES from '../types/Interfaces';

// Doc: Reads and filters the app.log file (JSONL), newest-first, paginated.
// Doc: Args: filters (LogFilters) - level/startDate/endDate/search/page/pageSize
// Doc: Returns: LogEntriesResult - { entries, total }
export const getLogEntries = (filters: INTERFACES.LogFilters): INTERFACES.LogEntriesResult => {
    logger.debug('Log.Service.ts: getLogEntries() - reading logs/app.log', {filters});

    const logFilePath = path.join(process.cwd(), 'logs/app.log');
    const raw = fs.readFileSync(logFilePath, 'utf-8');
    const lines = raw.split('\n').filter(Boolean);

    const entries = lines
        .map(line => { try { return JSON.parse(line); } catch { return null; } })  // skip a truncated last line
        .filter((e): e is INTERFACES.LogEntry => e !== null)
        .filter(e => !filters.level || e.level === filters.level)
        .filter(e => !filters.startDate || new Date(e.timestamp) >= filters.startDate!)
        .filter(e => !filters.endDate || new Date(e.timestamp) <= filters.endDate!)
        // TODO: search currently only matches `message`. Extending to also match inside
        // `context` (e.g. finding logs by an email/id buried in context) would need
        // JSON.stringify(e.context) per entry before matching — deferred until it's
        // actually needed, since it adds real cost to every request for a case that
        // hasn't come up yet.
        .filter(e => !filters.search || e.message.toLowerCase().includes(filters.search!.toLowerCase()))
        .reverse();  // newest-first

    const total = entries.length;
    const start = (filters.page - 1) * filters.pageSize;

    logger.debug('Log.Service.ts: getLogEntries() - filtered', {total, page: filters.page, pageSize: filters.pageSize});

    return { entries: entries.slice(start, start + filters.pageSize), total };
};

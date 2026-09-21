// Doc: InstanceHealthCheck reports on the health of the EC2 host the server process is running on
// Doc: (this app runs directly under pm2, not in a container, so Node's `os` module reflects real
// Doc: host-level numbers). `id` is the contract with the frontend (WorkflowsTab.tsx's hardcoded
// Doc: WORKFLOWS list) — keep it in sync if either side changes.
import { exec } from 'child_process';
import * as os from 'os';
import logger from '../util/logger/LoggerImpl';
import { WorkflowDefinition } from '../types/Interfaces';
import { getDailyVisitorCount, getRecentDailyVisitorCounts } from '../services/siteVisit.service';

const BYTES_PER_GB = 1024 ** 3;
const toGB = (bytes: number): string => (bytes / BYTES_PER_GB).toFixed(2);

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

// Doc: Step 1 — memory and CPU. Load average is a Linux-only proxy for CPU pressure (not a
// Doc: percentage): a 1-minute load equal to the core count means the CPUs are, on average, fully
// Doc: busy over that window.
async function checkMemoryAndCpu(): Promise<string> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usedPct = ((usedMem / totalMem) * 100).toFixed(1);
    const [load1, load5, load15] = os.loadavg();
    const cores = os.cpus().length;

    logger.info('InstanceHealthCheck-L1-MemoryAndCpu: collected metrics', {
        totalMemGB: toGB(totalMem), freeMemGB: toGB(freeMem), usedPct, load1, load5, load15, cores,
    });

    return `Memory: ${toGB(usedMem)} GB / ${toGB(totalMem)} GB used (${usedPct}%) — `
        + `Load avg (1/5/15m): ${load1.toFixed(2)} / ${load5.toFixed(2)} / ${load15.toFixed(2)} across ${cores} core(s)`;
}

// Doc: Step 2 — disk usage (via `df`, Linux-only like the rest of this workflow) and process/instance
// Doc: uptime. Shells out rather than adding a dependency for something `df -h /` already reports.
async function getDiskUsage(): Promise<string | null> {
    // `df` isn't available on Windows dev machines — degrade gracefully rather than failing
    // the whole step, since this only needs to be reliable on the (Linux) EC2 host.
    if (process.platform !== 'linux' && process.platform !== 'darwin') return null;

    try {
        const df = await new Promise<string>((resolve, reject) => {
            exec('df -h --output=size,used,avail,pcent /', (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                    return;
                }
                resolve(stdout.trim());
            });
        });

        // df output: header line + one data line, e.g. "  8.0G  3.2G  4.4G  43% "
        const dataLine = df.split('\n').slice(1).join(' ').trim().replace(/\s+/g, ' ');
        const [size, used, avail, pcent] = dataLine.split(' ');
        return `${used} / ${size} used (${pcent}), ${avail} available`;
    } catch (error) {
        logger.error('InstanceHealthCheck-L2-DiskAndUptime: df failed', { error });
        return null;
    }
}

async function checkDiskAndUptime(): Promise<string> {
    const diskUsage = await getDiskUsage();
    const uptime = formatUptime(os.uptime());
    const processUptime = formatUptime(process.uptime());

    logger.info('InstanceHealthCheck-L2-DiskAndUptime: collected metrics', {
        diskUsage, instanceUptime: uptime, processUptime,
    });

    const diskLabel = diskUsage ?? 'unavailable on this platform';
    return `Disk (/): ${diskLabel} — Instance uptime: ${uptime}, server process uptime: ${processUptime}`;
}

// Doc: Step 3 — unique daily visitors. A "visit" is a home page load (see app.ts::GET /track/ping,
// Doc: which upserts a SiteVisit row per (ip, day) once per client per day).
async function checkDailyVisitors(): Promise<string> {
    const today = await getDailyVisitorCount();
    const recent = await getRecentDailyVisitorCounts(7);

    logger.info('InstanceHealthCheck-L3-DailyVisitors: collected metrics', { today, recent });

    const trend = recent.map(({ date, count }) => `${date}: ${count}`).join(', ');
    return `Unique visitors today: ${today} — Last 7 days: ${trend}`;
}

export const instanceHealthCheck: WorkflowDefinition = {
    id: 'instance-health-check',
    name: 'Instance Health Check',
    steps: [
        { name: 'InstanceHealthCheck-L1-MemoryAndCpu', run: checkMemoryAndCpu },
        { name: 'InstanceHealthCheck-L2-DiskAndUptime', run: checkDiskAndUptime },
        { name: 'InstanceHealthCheck-L3-DailyVisitors', run: checkDailyVisitors },
    ],
};

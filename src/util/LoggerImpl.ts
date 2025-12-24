import { LogLevel, CustomLogger } from "./Logger";
import * as fs from 'fs';
import * as path from 'path';

export class ConsoleLogger implements CustomLogger {
    private currentLevel: LogLevel;
    private serviceName: string;
    private logFilePath: string;

    constructor(serviceName: string, currentLevel: LogLevel = LogLevel.DEBUG, logFileName: string='logs/app.log') {
        this.currentLevel = currentLevel;
        this.serviceName = serviceName;
        this.logFilePath = path.join(process.cwd(), logFileName);
        this.ensureLogDirectory();
        console.log(`[LOGGER INIT] Service: ${serviceName} | Level: ${LogLevel[this.currentLevel]}`);
    }

    private ensureLogDirectory(): void {
        const dir = path.dirname(this.logFilePath);
        if(!fs.existsSync(dir))
        {
            fs.mkdirSync(dir, {recursive: true});
        }
    }

    private writeToFile(logEntry: object): void {
        const jsonString = JSON.stringify(logEntry);

        try {
            fs.appendFileSync(this.logFilePath, jsonString + '\n');
        } catch(error) {
            console.error('[LOGGER ERROR] Failed to write to log file: ', error);
        }
    }
    
    private log(level: LogLevel, message: string, context?: object): void {
        if(level > this.currentLevel) {
            return;
        }
        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];

        const logEntry = {
            timestamp: timestamp,
            level: levelName,
            service: this.serviceName,
            message: message,
            context: context || {}
        };
        
        // for console logging //
        // switch(level) {
        //     case LogLevel.ERROR:
        //         console.error(JSON.stringify(logEntry, null, 2));
        //         break;
        //     case LogLevel.INFO: 
        //         console.info(JSON.stringify(logEntry, null, 2));
        //         break;
        //     default:
        //         console.error('Invalid LogLevel provided');
        //         break;
        //} // switch //

        this.writeToFile(logEntry);
    } // log() //

    public error(message: string, context?: object): void {
        this.log(LogLevel.ERROR, message, context);
    }

    public info(message: string, context?: object): void {
        this.log(LogLevel.INFO, message, context);
    }

    public debug(message: string, context?: object): void {
        this.log(LogLevel.DEBUG, message, context);
    }
}

const logger: CustomLogger = new ConsoleLogger(
    'rpdr-fantasy-app',
    LogLevel.INFO
);

export default logger;
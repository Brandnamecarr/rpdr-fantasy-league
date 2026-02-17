// Doc: Logger implementation that writes structured JSON logs to a file.
// Doc: Exports a singleton logger instance configured for the rpdr-fantasy-app service.
import { LogLevel, CustomLogger } from "./Logger";
import * as fs from 'fs';
import * as path from 'path';

// Doc: Logger class that implements CustomLogger interface and writes JSON logs to file
// Doc: Constructor args: serviceName (string) - name of the service, currentLevel (LogLevel) - minimum log level to record, logFileName (string) - path to log file
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

    // Doc: Private method that ensures the log directory exists, creates it if needed
    private ensureLogDirectory(): void {
        const dir = path.dirname(this.logFilePath);
        if(!fs.existsSync(dir))
        {
            fs.mkdirSync(dir, {recursive: true});
        }
    }

    // Doc: Private method that writes a log entry object as JSON to the log file
    // Doc: Args: logEntry (object) - The structured log entry to write
    private writeToFile(logEntry: object): void {
        const jsonString = JSON.stringify(logEntry);

        try {
            fs.appendFileSync(this.logFilePath, jsonString + '\n');
        } catch(error) {
            console.error('[LOGGER ERROR] Failed to write to log file: ', error);
        }
    }
    
    // Doc: Private core logging method that formats and writes log entries if level meets threshold
    // Doc: Args: level (LogLevel) - Log severity level, message (string) - Log message, context (object?) - Optional context data
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

        this.writeToFile(logEntry);
    } // log() //

    // Doc: Public method to log error messages
    // Doc: Args: message (string) - Error message, context (object?) - Optional context data
    public error(message: string, context?: object): void {
        this.log(LogLevel.ERROR, message, context);
    }

    // Doc: Public method to log info messages
    // Doc: Args: message (string) - Info message, context (object?) - Optional context data
    public info(message: string, context?: object): void {
        this.log(LogLevel.INFO, message, context);
    }

    // Doc: Public method to log debug messages
    // Doc: Args: message (string) - Debug message, context (object?) - Optional context data
    public debug(message: string, context?: object): void {
        this.log(LogLevel.DEBUG, message, context);
    }
}

// Doc: Singleton logger instance configured for the rpdr-fantasy-app service with DEBUG level logging
const logger: CustomLogger = new ConsoleLogger(
    'rpdr-fantasy-app',
    LogLevel.DEBUG
);

export default logger;
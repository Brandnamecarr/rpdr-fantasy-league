"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
// Doc: Logger implementation that writes structured JSON logs to a file.
// Doc: Exports a singleton logger instance configured for the rpdr-fantasy-app service.
const Logger_1 = require("./Logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Doc: Logger class that implements CustomLogger interface and writes JSON logs to file
// Doc: Constructor args: serviceName (string) - name of the service, currentLevel (LogLevel) - minimum log level to record, logFileName (string) - path to log file
class ConsoleLogger {
    constructor(serviceName, currentLevel = Logger_1.LogLevel.DEBUG, logFileName = 'logs/app.log') {
        this.currentLevel = currentLevel;
        this.serviceName = serviceName;
        this.logFilePath = path.join(process.cwd(), logFileName);
        this.ensureLogDirectory();
        console.log(`[LOGGER INIT] Service: ${serviceName} | Level: ${Logger_1.LogLevel[this.currentLevel]}`);
    }
    // Doc: Private method that ensures the log directory exists, creates it if needed
    ensureLogDirectory() {
        const dir = path.dirname(this.logFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    // Doc: Private method that writes a log entry to stdout and to the log file.
    // Doc: Stdout emission ensures Fargate captures logs in CloudWatch via the awslogs driver.
    // Doc: Args: logEntry (object) - The structured log entry to write
    writeToFile(logEntry) {
        const jsonString = JSON.stringify(logEntry);
        // Always emit to stdout so CloudWatch Logs captures it in Fargate
        process.stdout.write(jsonString + '\n');
        // Also persist to local file (useful in local dev; ignored in ephemeral containers)
        try {
            fs.appendFileSync(this.logFilePath, jsonString + '\n');
        }
        catch (error) {
            console.error('[LOGGER ERROR] Failed to write to log file: ', error);
        }
    }
    // Doc: Private core logging method that formats and writes log entries if level meets threshold
    // Doc: Args: level (LogLevel) - Log severity level, message (string) - Log message, context (object?) - Optional context data
    log(level, message, context) {
        if (level > this.currentLevel) {
            return;
        }
        const timestamp = new Date().toISOString();
        const levelName = Logger_1.LogLevel[level];
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
    error(message, context) {
        this.log(Logger_1.LogLevel.ERROR, message, context);
    }
    // Doc: Public method to log info messages
    // Doc: Args: message (string) - Info message, context (object?) - Optional context data
    info(message, context) {
        this.log(Logger_1.LogLevel.INFO, message, context);
    }
    // Doc: Public method to log debug messages
    // Doc: Args: message (string) - Debug message, context (object?) - Optional context data
    debug(message, context) {
        this.log(Logger_1.LogLevel.DEBUG, message, context);
    }
}
exports.ConsoleLogger = ConsoleLogger;
// Doc: Singleton logger instance configured for the rpdr-fantasy-app service with DEBUG level logging
const logger = new ConsoleLogger('rpdr-fantasy-app', Logger_1.LogLevel.DEBUG);
exports.default = logger;

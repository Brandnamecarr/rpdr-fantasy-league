// Doc: Logging utility type definitions and interfaces used throughout the application.

// Doc: Enum defining log severity levels (ERROR=0, INFO=1, DEBUG=2)
export enum LogLevel {
    ERROR=0,
    INFO=1,
    DEBUG=2
}
// Doc: Interface for custom logger implementations with error, info, and debug methods
// Doc: Methods: error(message, context?) - logs error messages, info(message, context?) - logs info messages, debug(message, context?) - logs debug messages
export interface CustomLogger {
    error(message: string, context?: object): void;
    info(message:string, context?: object): void;
    debug(message: string, content?: object): void;
}

export enum LogLevel {
    ERROR=0,
    INFO=1,
    DEBUG=2
}
export interface CustomLogger {
    error(message: string, context?: object): void;
    info(message:string, context?: object): void;
    debug(message: string, content?: object): void;
}
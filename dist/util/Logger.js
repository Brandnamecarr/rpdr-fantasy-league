"use strict";
// Doc: Logging utility type definitions and interfaces used throughout the application.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = void 0;
// Doc: Enum defining log severity levels (ERROR=0, INFO=1, DEBUG=2)
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 2] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));

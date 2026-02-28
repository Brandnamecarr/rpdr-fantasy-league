"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Doc: Server entry point that starts the Express application.
// Doc: Imports the configured app and starts listening on port 3000.
const app_1 = __importDefault(require("./app"));
// Doc: Server port — reads from PORT env var so Fargate task definition controls it.
const PORT = parseInt(process.env.PORT ?? '3000', 10);
// Doc: Starts the Express server listening on the specified port
app_1.default.listen(PORT, () => {
    console.log(`Server.ts running on port ${PORT}.`);
});

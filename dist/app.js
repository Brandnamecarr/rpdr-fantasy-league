"use strict";
// Doc: Main Express application configuration file.
// Doc: Sets up middleware (CORS, JSON parsing) and defines all API route endpoints.
// Doc: Routes configured: /users, /league, /leagueOps, /notifications, /queens, /activeSeason
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// express imports //
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// application imports // 
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const league_routes_1 = __importDefault(require("./routes/league.routes"));
const leagueOps_routes_1 = __importDefault(require("./routes/leagueOps.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const queen_routes_1 = __importDefault(require("./routes/queen.routes"));
const activeSeasons_routes_1 = __importDefault(require("./routes/activeSeasons.routes"));
// Doc: Express app instance with middleware configuration
const app = (0, express_1.default)();
// Doc: CORS origin — reads from CORS_ORIGIN env var so each environment
//      (local, staging, prod) restricts access to the correct frontend.
//      Falls back to localhost:5173 for local development.
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use((0, cors_1.default)({
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: false
}));
// Doc: JSON body parser middleware
app.use(express_1.default.json());
// Doc: Health check endpoint used by the Fargate/ALB target group.
//      Returns 200 immediately — no auth required.
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Doc: Route definitions mapping URL paths to route handlers
app.use('/users', user_routes_1.default);
app.use('/league', league_routes_1.default);
app.use('/leagueOps', leagueOps_routes_1.default);
app.use('/notifications', notification_routes_1.default);
app.use('/queens', queen_routes_1.default);
app.use('/activeSeason', activeSeasons_routes_1.default);
exports.default = app;

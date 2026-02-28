// Doc: Main Express application configuration file.
// Doc: Sets up middleware (CORS, JSON parsing) and defines all API route endpoints.
// Doc: Routes configured: /users, /league, /leagueOps, /notifications, /queens, /activeSeason

// express imports //
import express, { Request, Response } from 'express';
import cors from 'cors';

// application imports // 
import userRoutes from './routes/user.routes';
import leagueRoutes from './routes/league.routes';
import leagueOpsRoutes from './routes/leagueOps.routes';
import notifRoutes from './routes/notification.routes';
import queenRoutes from './routes/queen.routes';
import activeSeasonRoutes from './routes/activeSeasons.routes';

// Doc: Express app instance with middleware configuration
const app = express();

// Doc: CORS origin — reads from CORS_ORIGIN env var so each environment
//      (local, staging, prod) restricts access to the correct frontend.
//      Falls back to localhost:5173 for local development.
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use(cors({
    origin: corsOrigin,
    methods:['GET', 'POST'],
    credentials: false
}));

// Doc: JSON body parser middleware
app.use(express.json());

// Doc: Health check endpoint used by the Fargate/ALB target group.
//      Returns 200 immediately — no auth required.
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

// Doc: Route definitions mapping URL paths to route handlers
app.use('/users', userRoutes);
app.use('/league', leagueRoutes);
app.use('/leagueOps', leagueOpsRoutes);
app.use('/notifications', notifRoutes);
app.use('/queens', queenRoutes);
app.use('/activeSeason', activeSeasonRoutes);

export default app;
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
// Doc: CORS configuration allowing requests from frontend at localhost:5173
app.use(cors({
    origin: 'http://localhost:5173',
    methods:['GET', 'POST'],
    credentials: false
}));
// Doc: JSON body parser middleware
app.use(express.json());

// Doc: Route definitions mapping URL paths to route handlers
app.use('/users', userRoutes);
app.use('/league', leagueRoutes);
app.use('/leagueOps', leagueOpsRoutes);
app.use('/notifications', notifRoutes);
app.use('/queens', queenRoutes);
app.use('/activeSeason', activeSeasonRoutes);

export default app;
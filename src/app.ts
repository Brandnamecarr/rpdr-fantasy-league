/**
 * This file handles main functionality for routes and controllers
 */

// express imports //
import express, { Request, Response } from 'express';
import cors from 'cors';

// application imports // 
import userRoutes from './routes/user.routes';
import leagueRoutes from './routes/league.routes';
import leagueOpsRoutes from './routes/leagueOps.routes';

// app stuff
const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods:['GET', 'POST'],
    credentials: false
}));
app.use(express.json());

// define routes here
app.use('/users', userRoutes);
app.use('/league', leagueRoutes);
app.use('/leagueOps', leagueOpsRoutes);

export default app;
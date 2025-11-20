/**
 * This file handles main functionality for routes and controllers
 */

// express imports //
import express, { Request, Response } from 'express';

// application imports // 
import userRoutes from './routes/user.routes';
import leagueRoutes from './routes/league.routes';
import leagueOpsRoutes from './routes/leagueOps.routes';

// app stuff
const app = express();
app.use(express.json());

// define routes here
app.use('/users', userRoutes);
app.use('/league', leagueRoutes);
app.use('/leagueOps', leagueOpsRoutes);

export default app;
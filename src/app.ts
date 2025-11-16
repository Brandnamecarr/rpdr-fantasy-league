/**
 * This file handles main functionality for routes and controllers
 */

// express imports //
import express, { Request, Response } from 'express';

// application imports // 
import userRoutes from './routes/user.routes';

// app stuff
const app = express();
app.use(express.json());

// define routes here
app.use('/users', userRoutes);

export default app;
// Doc: Main Express application configuration file.
// Doc: Sets up middleware (CORS, JSON parsing) and defines all API route endpoints.
// Doc: Routes configured: /users, /league, /leagueOps, /notifications, /queens, /activeSeason, /admin, /subscription

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
import adminRoutes from './routes/admin.routes';
import subscriptionRoutes from './routes/subscription.routes';
import { recordVisit } from './services/siteVisit.service';

// Doc: Express app instance with middleware configuration
const app = express();

// Doc: Trust the ALB's X-Forwarded-For header so req.ip reflects the real
//      client IP instead of the load balancer's internal address.
app.set('trust proxy', true);

// Doc: CORS origin — reads from CORS_ORIGIN env var so each environment
//      (local, staging, prod) restricts access to the correct frontend.
//      Falls back to localhost:5173 for local development.
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use(cors({
    origin: corsOrigin,
    methods:['GET', 'POST', 'PATCH'],
    credentials: false
}));

// Doc: Stripe webhook route needs the raw request body (not JSON-parsed) so a future
//      stripe.webhooks.constructEvent(rawBody, signature, secret) call can verify the signature.
//      Must be mounted with a path-scoped raw parser BEFORE the global express.json() below —
//      once express.json() consumes the body, it's gone for any handler mounted after it.
app.use('/subscription/webhook', express.raw({ type: 'application/json' }));

// Doc: JSON body parser middleware
app.use(express.json());

// Doc: Health check endpoint used by the Fargate/ALB target group.
//      Returns 200 immediately — no auth required.
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

// Doc: Public (no-auth) visit-tracking beacon. The React app calls this once on home page load so
//      anonymous/logged-out traffic is counted, not just authenticated requests.
app.get('/track/ping', (req: Request, res: Response) => {
    recordVisit(req.ip ?? 'unknown'); // fire-and-forget — must never delay or fail the response
    res.status(204).end();
});

// Doc: Route definitions mapping URL paths to route handlers
app.use('/users', userRoutes);
app.use('/league', leagueRoutes);
app.use('/leagueOps', leagueOpsRoutes);
app.use('/notifications', notifRoutes);
app.use('/queens', queenRoutes);
app.use('/activeSeason', activeSeasonRoutes);
app.use('/admin', adminRoutes);
app.use('/subscription', subscriptionRoutes);

export default app;
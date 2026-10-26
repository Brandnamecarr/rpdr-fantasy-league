import { Response } from "express";
import * as subscriptionService from "../services/subscription.service";
import logger from "../util/logger/LoggerImpl";
import { AuthRequest } from "../types/CustomRequests";
import { CaughtError } from "../types/Interfaces";

// Doc: POST /subscription/start — real route, but Stripe Checkout is not implemented yet.
// Doc: Always responds 501 with the NOT_IMPLEMENTED sentinel so the frontend can build against the
// Doc: real contract now and swap in an actual Stripe flow later without a route change.
export const start = async (req: AuthRequest, res: Response) => {
    const email = req.user!.email;
    logger.info('Subscription.Controller.ts: start() - request received', { email });

    try {
        await subscriptionService.startMembership(email);
        // Doc: startMembership() always throws NOT_IMPLEMENTED today — this line is unreachable
        // Doc: until real Stripe Checkout integration lands, at which point it'll return { url }.
        return res.status(200).json({});
    } catch (error) {
        const err = error as CaughtError;
        if (err?.message === 'NOT_IMPLEMENTED') {
            return res.status(501).json({ Error: 'NOT_IMPLEMENTED' });
        }
        logger.error('Subscription.Controller.ts: start() - unexpected error', { email, error });
        return res.status(500).json({ Error: 'Error starting membership checkout' });
    }
};

// Doc: POST /subscription/cancel — real end-to-end. Checks for an active subscription and, per the
// Doc: design doc's cancel-at-period-end semantics, would mark it to cancel via Stripe — but Stripe
// Doc: itself is not called yet (see subscription.service.ts's TODO log).
export const cancel = async (req: AuthRequest, res: Response) => {
    const email = req.user!.email;
    logger.info('Subscription.Controller.ts: cancel() - request received', { email });

    try {
        await subscriptionService.cancelMembership(email);
        return res.status(200).json({ message: 'Membership will cancel at the end of the billing period.' });
    } catch (error) {
        const err = error as CaughtError;
        if (err?.message === 'NO_ACTIVE_SUBSCRIPTION') {
            return res.status(400).json({ Error: 'NO_ACTIVE_SUBSCRIPTION' });
        }
        logger.error('Subscription.Controller.ts: cancel() - unexpected error', { email, error });
        return res.status(500).json({ Error: 'Error canceling membership' });
    }
};

// Doc: GET /subscription/status — fully real, reads cached membership fields straight from the User row.
export const status = async (req: AuthRequest, res: Response) => {
    const email = req.user!.email;
    logger.debug('Subscription.Controller.ts: status() - request received', { email });

    try {
        const result = await subscriptionService.getSubscriptionStatus(email);
        return res.status(200).json(result);
    } catch (error) {
        logger.error('Subscription.Controller.ts: status() - unexpected error', { email, error });
        return res.status(500).json({ Error: 'Error fetching subscription status' });
    }
};

// Doc: POST /subscription/webhook — real, registered route. Requires no auth (Stripe calls this
// Doc: directly, and Stripe events are authenticated via signature verification instead of a JWT/API
// Doc: key), and must receive the raw request body (mounted with express.raw() ahead of the global
// Doc: JSON parser in app.ts) so a future stripe.webhooks.constructEvent() call can verify it.
// Doc: No signature verification or event handling exists yet — always responds 200 so Stripe doesn't
// Doc: retry a request this server intentionally doesn't act on yet.
export const webhook = async (req: AuthRequest, res: Response) => {
    logger.warn('Subscription.Controller.ts: webhook() - TODO: Stripe signature verification and event handling not yet implemented');
    try {
        await subscriptionService.handleWebhook();
        return res.status(200).json({ received: true });
    } catch (error) {
        logger.error('Subscription.Controller.ts: webhook() - unexpected error', { error });
        return res.status(500).json({ Error: 'Error handling webhook' });
    }
};

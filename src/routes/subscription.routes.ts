// Doc: Route definitions for subscription/membership endpoints. Per the design doc
// Doc: (.claude/plans/subscription-payment-design.md), all routes are JWT-protected except the
// Doc: webhook, which Stripe calls directly and authenticates via signature (not yet implemented)
// Doc: rather than a user JWT or the admin key.
// Doc: Base path: /subscription
import { Router } from "express";
import { protect } from "../util/credentials/TokenManager";
import * as subscriptionController from "../controllers/subscription.controller";

const router = Router();

// Doc: POST /subscription/start - Would create a Stripe Checkout session; currently returns
// Doc: 501 { Error: 'NOT_IMPLEMENTED' } since no Stripe integration exists yet.
router.post("/start", protect, subscriptionController.start);
// Doc: POST /subscription/cancel - Cancels the current membership at period end (no-op against
// Doc: Stripe today; returns 400 { Error: 'NO_ACTIVE_SUBSCRIPTION' } when there's nothing to cancel).
router.post("/cancel", protect, subscriptionController.cancel);
// Doc: GET /subscription/status - Returns cached { hasActiveMembership, membershipCancelAtPeriodEnd, membershipRenewsAt } for the authenticated user.
router.get("/status", protect, subscriptionController.status);
// Doc: POST /subscription/webhook - Stripe webhook receiver. No auth middleware (Stripe signature
// Doc: verification is the auth mechanism here, not yet implemented). Requires the raw request body,
// Doc: which app.ts mounts ahead of the global express.json() parser for this specific path.
router.post("/webhook", subscriptionController.webhook);

export default router;

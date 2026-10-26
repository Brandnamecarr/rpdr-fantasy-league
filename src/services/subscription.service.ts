import prisma from "../db/prisma.client";
import logger from "../util/logger/LoggerImpl";
import { SubscriptionStatus } from "../types/Interfaces";

// Doc: NOT_IMPLEMENTED — no Stripe integration exists yet. This function intentionally does no
// Doc: Stripe work (no Customer creation, no Checkout Session). It exists so the real route/controller
// Doc: contract (POST /subscription/start) is in place for clients to build against ahead of the
// Doc: actual Stripe integration landing. See .claude/plans/subscription-payment-design.md.
// Doc: Args: email (string) - the requesting user's email
// Doc: Throws: 'NOT_IMPLEMENTED' — always, until Stripe Checkout is wired up.
export const startMembership = async (email: string): Promise<never> => {
    logger.warn('Subscription.Service.ts: startMembership() - TODO: Stripe Checkout integration not yet implemented', { email });
    throw new Error('NOT_IMPLEMENTED');
};

// Doc: Marks the user's subscription to cancel at the end of the current billing period.
// Doc: Since no Stripe integration exists yet, no user will ever have a stripeSubscriptionId,
// Doc: so this always throws 'NO_ACTIVE_SUBSCRIPTION' for now. The stripe.subscriptions.update(...)
// Doc: call (and the DB flag flip) are left as a TODO for when real subscriptions can exist.
// Doc: Args: email (string) - the requesting user's email
// Doc: Throws: 'NO_ACTIVE_SUBSCRIPTION' if the user has no stripeSubscriptionId on file.
export const cancelMembership = async (email: string): Promise<void> => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { membership: true } });

    if (!user.membership?.hasActiveMembership || !user.membership?.stripeSubscriptionId) {
        logger.error('Subscription.Service.ts: cancelMembership() - no active subscription to cancel', { email });
        throw new Error('NO_ACTIVE_SUBSCRIPTION');
    }

    // Doc: TODO: Stripe subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true })
    // Doc: not yet implemented — no Stripe SDK usage exists in this codebase yet.
    logger.warn('Subscription.Service.ts: cancelMembership() - TODO: Stripe subscription cancel-at-period-end not yet implemented', { email });
};

// Doc: Returns the cached membership status fields straight from the user's Membership row (via
// Doc: the User.membership relation) — no live Stripe call. Falls back to false/false/null if the
// Doc: user has no Membership row yet (no row is ever created until a real subscription exists).
// Doc: Args: email (string) - the requesting user's email
// Doc: Returns: Promise<SubscriptionStatus>
export const getSubscriptionStatus = async (email: string): Promise<SubscriptionStatus> => {
    logger.debug('Subscription.Service.ts: getSubscriptionStatus() - fetching cached membership status', { email });
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { membership: true } });

    return {
        hasActiveMembership: user.membership?.hasActiveMembership ?? false,
        membershipCancelAtPeriodEnd: user.membership?.membershipCancelAtPeriodEnd ?? false,
        membershipRenewsAt: user.membership?.membershipRenewsAt ?? null,
    };
};

// Doc: Handles Stripe webhook events. No signature verification or event handling exists yet —
// Doc: this is a placeholder that logs and returns so the route is real and registered ahead of
// Doc: the actual Stripe integration landing.
export const handleWebhook = async (): Promise<void> => {
    logger.warn('Subscription.Service.ts: handleWebhook() - TODO: Stripe signature verification and event handling not yet implemented');
};

// Doc: Returns true if a free (non-member) user is already at the 1-league cap (owner or member of
// Doc: >=1 league). Paying members (hasActiveMembership) are always exempt. Reuses the same
// Doc: OR: [{owner}, {users: {has}}] query shape user.service.ts's getUserRecord uses to compute
// Doc: "how many leagues is this user in" — membership isn't a join table in this schema, so league
// Doc: participation has to be counted this way rather than via a relation.
// Doc: Args: email (string) - the user's email
// Doc: Returns: Promise<boolean> - true if the user is free-tier and already in >=1 league
export const isOverFreeLeagueLimit = async (email: string): Promise<boolean> => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { membership: true } });
    if (user.membership?.hasActiveMembership) return false;

    const count = await prisma.league.count({ where: { OR: [{ owner: email }, { users: { has: email } }] } });
    return count >= 1;
};

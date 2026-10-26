// Doc: SendNotification creates an in-app Notification record (see notification.service.ts) for an
// Doc: explicit, admin-selected list of user emails — the notification equivalent of SendEmail, but
// Doc: targeted at a specific group of users instead of a league/franchise/season. `id` is the
// Doc: contract with the frontend (WorkflowsTab.tsx's hardcoded WORKFLOWS list) — keep it in sync if
// Doc: either side changes. Requires `input` (see SendNotificationInput in types/Interfaces.ts)
// Doc: passed through POST /admin/workflows/execute.
import logger from '../util/logger/LoggerImpl';
import prisma from '../db/prisma.client';
import { getDisplayNames } from '../services/user.service';
import { WorkflowDefinition, WorkflowInput, SendNotificationInput } from '../types/Interfaces';

// Doc: Narrows/validates the generic WorkflowInput bag into the shape SendNotification needs. Throws
// Doc: (failing the step, surfaced to the admin UI) if required fields are missing or malformed.
function parseSendNotificationInput(input?: WorkflowInput): SendNotificationInput {
    const recipients = input?.recipients;
    const source = input?.source;
    const content = input?.content;

    if (!Array.isArray(recipients) || recipients.length === 0 || !recipients.every(r => typeof r === 'string')) {
        throw new Error('SendNotification requires a non-empty recipients array (string[] of user emails)');
    }
    if (typeof source !== 'string' || !source) {
        throw new Error('SendNotification requires a source (string)');
    }
    if (typeof content !== 'string' || !content) {
        throw new Error('SendNotification requires content (string)');
    }

    return { recipients: Array.from(new Set(recipients)), source, content };
}

// Doc: Resolves the requested recipient emails against real user accounts, dropping any that don't
// Doc: exist. Shared by both steps so each one stays independent/idempotent rather than passing state
// Doc: between them.
async function resolveRecipients(notifInput: SendNotificationInput): Promise<string[]> {
    const matches = await getDisplayNames(notifInput.recipients);
    return matches.map(u => u.email);
}

// Doc: Step 1 — resolves and reports how many of the requested recipients are real users, without sending anything.
async function resolveRecipientsStep(input?: WorkflowInput): Promise<string> {
    const notifInput = parseSendNotificationInput(input);
    const recipients = await resolveRecipients(notifInput);

    logger.info('SendNotification-L1-ResolveRecipients: resolved recipients', {
        requested: notifInput.recipients.length,
        resolved: recipients.length,
    });
    return `Resolved ${recipients.length} of ${notifInput.recipients.length} requested recipient(s).`;
}

// Doc: Step 2 — creates a Notification record for each resolved recipient via a single batched
// Doc: createMany call rather than sequential per-recipient writes. createMany is all-or-nothing and
// Doc: only returns a row count (no per-recipient success/failure or created rows), so on error the
// Doc: whole batch is reported as failed (0 sent) rather than faking partial-failure granularity.
async function sendNotificationsStep(input?: WorkflowInput): Promise<string> {
    const notifInput = parseSendNotificationInput(input);
    const recipients = await resolveRecipients(notifInput);

    if (recipients.length === 0) {
        logger.info('SendNotification-L2-SendNotifications: no recipients to notify');
        return 'No recipients to notify.';
    }

    try {
        const result = await prisma.notification.createMany({
            data: recipients.map(destination => ({
                source: notifInput.source,
                destination,
                content: notifInput.content,
            })),
        });

        logger.info('SendNotification-L2-SendNotifications: notifications sent', { sent: result.count, requested: recipients.length });
        return `Sent ${result.count} of ${recipients.length} notification(s).`;
    } catch (error) {
        logger.error('SendNotification-L2-SendNotifications: batch insert failed', { requested: recipients.length, error });
        return `Sent 0 of ${recipients.length} notification(s) — batch insert failed.`;
    }
}

export const sendNotification: WorkflowDefinition = {
    id: 'send-notification',
    name: 'Send Notification',
    steps: [
        { name: 'SendNotification-L1-ResolveRecipients', run: resolveRecipientsStep },
        { name: 'SendNotification-L2-SendNotifications', run: sendNotificationsStep },
    ],
};

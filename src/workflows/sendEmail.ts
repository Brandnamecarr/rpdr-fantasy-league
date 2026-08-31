// Doc: SendEmail resolves a recipient list (either every member of every league in a franchise/season,
// Doc: or "all subscribers") and sends each of them an email with the given subject/message.
// Doc: `id` is the contract with the frontend (WorkflowsTab.tsx's hardcoded WORKFLOWS list) —
// Doc: keep it in sync if either side changes. Like LookFinder, SendEmail requires `input` (see
// Doc: SendEmailInput in types/Interfaces.ts) passed through POST /admin/workflows/execute.
// Doc: Email sending isn't implemented yet — step 2 only logs where the call to the email utility
// Doc: would go once one exists.
import logger from '../util/logger/LoggerImpl';
import { getLeaguesByFranchiseAndSeason } from '../services/league.service';
import { WorkflowDefinition, WorkflowInput, SendEmailInput } from '../types/Interfaces';

// Doc: Narrows/validates the generic WorkflowInput bag into the shape SendEmail needs. Throws
// Doc: (failing the step, surfaced to the admin UI) if required fields are missing or malformed.
function parseSendEmailInput(input?: WorkflowInput): SendEmailInput {
    const target = input?.target;
    const subject = input?.subject;
    const message = input?.message;

    if (target !== 'all-subscribers' && target !== 'league') {
        throw new Error("SendEmail requires a target of 'all-subscribers' or 'league'");
    }
    if (typeof subject !== 'string' || !subject) {
        throw new Error('SendEmail requires a subject (string)');
    }
    if (typeof message !== 'string' || !message) {
        throw new Error('SendEmail requires a message (string)');
    }

    if (target === 'league') {
        const franchise = input?.franchise;
        const season = input?.season;
        if (typeof franchise !== 'string' || !franchise) {
            throw new Error("SendEmail target 'league' requires a franchise (string)");
        }
        if (typeof season !== 'number') {
            throw new Error("SendEmail target 'league' requires a season (number)");
        }
        return { target, franchise, season, subject, message };
    }

    return { target, subject, message };
}

// Doc: Resolves the recipient email list for the given target. Shared by both steps so each one
// Doc: stays independent/idempotent rather than passing state between them.
async function resolveRecipients(emailInput: SendEmailInput): Promise<string[]> {
    if (emailInput.target === 'all-subscribers') {
        // TODO: there's no "paying subscriber" concept in the schema yet (User has no
        // subscription/billing field). Wire this up to the real subscriber list once that
        // exists — for now this intentionally resolves zero recipients.
        logger.info('SendEmail: TODO — "All Subscribers" targeting is not implemented yet (no subscriber data source); resolving 0 recipients.');
        return [];
    }

    const leagues = await getLeaguesByFranchiseAndSeason(emailInput.franchise!, emailInput.season!);
    const recipients = new Set<string>();
    for (const league of leagues) {
        recipients.add(league.owner);
        league.users.forEach(email => recipients.add(email));
    }
    return Array.from(recipients);
}

// Doc: Step 1 — resolves and reports how many recipients this send would reach, without sending anything.
async function resolveRecipientsStep(input?: WorkflowInput): Promise<string> {
    const emailInput = parseSendEmailInput(input);
    const recipients = await resolveRecipients(emailInput);

    logger.info('SendEmail-L1-ResolveRecipients: resolved recipients', {
        target: emailInput.target,
        franchise: emailInput.franchise,
        season: emailInput.season,
        count: recipients.length,
    });
    return `Resolved ${recipients.length} recipient(s) for target "${emailInput.target}".`;
}

// Doc: Step 2 — sends (or, until the email utility exists, logs) the email to each resolved recipient.
async function sendEmailsStep(input?: WorkflowInput): Promise<string> {
    const emailInput = parseSendEmailInput(input);
    const recipients = await resolveRecipients(emailInput);

    if (recipients.length === 0) {
        logger.info('SendEmail-L2-SendEmails: no recipients to email', { target: emailInput.target });
        return 'No recipients to email.';
    }

    for (const to of recipients) {
        // TODO: email sending isn't implemented yet — call the email utility here once it exists.
        logger.info('SendEmail-L2-SendEmails: would send email', {
            to, subject: emailInput.subject, message: emailInput.message,
        });
    }

    return `Would send ${recipients.length} email(s) with subject "${emailInput.subject}".`;
}

export const sendEmail: WorkflowDefinition = {
    id: 'send-email',
    name: 'Send Email',
    steps: [
        { name: 'SendEmail-L1-ResolveRecipients', run: resolveRecipientsStep },
        { name: 'SendEmail-L2-SendEmails', run: sendEmailsStep },
    ],
};

// Doc: Email utility for sending transactional emails via SMTP (nodemailer).
// Doc: Works with any SMTP provider - Gmail, SendGrid, Mailgun, AWS SES SMTP, etc. Configure via env vars below.
import nodemailer, { Transporter } from 'nodemailer';
import logger from '../logger/LoggerImpl';
import { EmailInput } from '../../types/Interfaces';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM ?? SMTP_USER ?? 'no-reply@rpdr-fantasy-league.com';

let transporter: Transporter | null = null;

// Doc: Lazily builds and caches the nodemailer transporter from SMTP_* env vars.
function getTransporter(): Transporter {
    if (transporter) return transporter;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        throw new Error('EmailManager: missing SMTP_HOST, SMTP_USER, or SMTP_PASS environment variables');
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    return transporter;
}

// Doc: Sends an email via the configured SMTP transport.
// Doc: Args: input (EmailInput) - to, subject, and either text and/or html body, plus optional from override
// Doc: Returns: Promise<boolean> - true if the email was sent, false on error
export async function sendEmail(input: EmailInput): Promise<boolean> {
    try {
        await getTransporter().sendMail({
            from: input.from ?? EMAIL_FROM,
            to: input.to,
            subject: input.subject,
            text: input.text,
            html: input.html,
        });
        logger.debug('EmailManager.sendEmail() -> email sent', { to: input.to, subject: input.subject });
        return true;
    } catch (error) {
        logger.error('EmailManager.sendEmail() -> failed to send email', { to: input.to, subject: input.subject, error });
        return false;
    }
}

// Doc: Verifies the SMTP connection/credentials are usable. Useful for a startup or health check.
// Doc: Returns: Promise<boolean> - true if the SMTP server accepted the connection
export async function verifyConnection(): Promise<boolean> {
    try {
        await getTransporter().verify();
        logger.debug('EmailManager.verifyConnection() -> SMTP connection verified');
        return true;
    } catch (error) {
        logger.error('EmailManager.verifyConnection() -> SMTP verification failed', { error });
        return false;
    }
}

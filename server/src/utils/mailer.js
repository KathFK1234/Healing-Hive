import nodemailer from "nodemailer";
import env from "../config/env.js";

// Two ways out: Brevo's HTTPS API when BREVO_API_KEY is set (it works on hosts
// that block SMTP, such as Railway's Hobby plan), otherwise any SMTP provider.
// For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER=<address>,
// SMTP_PASS=<an app password>.
let transport;
function getTransport() {
    if (!env.SMTP_HOST) return null;
    transport ??= nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    return transport;
}

// "Healing Hive <no-reply@example.com>", or just the address, as Brevo wants it
export function parseSender(from) {
    const [, name, email] = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/) || [];
    if (!email) return { email: from.trim() };
    return name ? { name, email } : { email };
}

const BREVO_TIMEOUT_MS = 15 * 1000;

export async function sendWithBrevo({ from, to, subject, text }, { apiKey = env.BREVO_API_KEY, apiUrl = env.BREVO_API_URL } = {}) {
    const response = await fetch(`${apiUrl}/smtp/email`, {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: parseSender(from), to: [{ email: to }], subject, textContent: text }),
        signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    if (!response.ok) {
        // Brevo's code only: its message can repeat addresses from the email
        const answer = await response.json().catch(() => null);
        throw new Error(`Brevo answered ${response.status}${answer?.code ? ` (${answer.code})` : ""}`);
    }
}

// Tests read what would have been sent from here.
export const outbox = [];

// What to log for an email that could not be sent because no provider is set
// up. Locally the whole email is shown, so reset links can be followed. In
// production only the subject: the body can hold a password reset link, and
// anyone who can read the host's logs could use it to take over the account.
export function unsentLog({ to, subject, text }, production = env.isProduction) {
    if (production) return `Email not sent, no email provider is configured: "${subject}"`;
    return `\n--- Email (not sent, no email provider is configured) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---\n`;
}

// Sends one email. Never throws: a failed notification must not fail the
// booking or sign-up that triggered it.
export async function sendMail({ to, subject, text }) {
    const message = { from: env.MAIL_FROM, to, subject, text: `${text}\n\nHealing Hive · St;ll Here` };

    if (env.isTest) {
        outbox.push(message);
        return;
    }

    const smtp = getTransport();
    if (!env.BREVO_API_KEY && !smtp) {
        console.log(unsentLog({ to, subject, text }));
        return;
    }

    try {
        if (env.BREVO_API_KEY) await sendWithBrevo(message);
        else await smtp.sendMail(message);
    } catch (err) {
        console.error(`Could not send "${subject}" email:`, err.message);
    }
}

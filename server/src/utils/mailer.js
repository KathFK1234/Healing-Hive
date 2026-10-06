import nodemailer from "nodemailer";
import env from "../config/env.js";

// Works with any SMTP provider. For Gmail: SMTP_HOST=smtp.gmail.com,
// SMTP_PORT=465, SMTP_USER=<address>, SMTP_PASS=<an app password>.
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

// Tests read what would have been sent from here.
export const outbox = [];

// Sends one email. Never throws: a failed notification must not fail the
// booking or sign-up that triggered it.
export async function sendMail({ to, subject, text }) {
    const message = { from: env.MAIL_FROM, to, subject, text: `${text}\n\nHealing Hive · St;ll Here` };

    if (env.isTest) {
        outbox.push(message);
        return;
    }

    const smtp = getTransport();
    if (!smtp) {
        // No email provider configured (local development): show it in the log
        // so links such as password resets can still be followed.
        console.log(`\n--- Email (not sent, SMTP is not configured) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---\n`);
        return;
    }

    try {
        await smtp.sendMail(message);
    } catch (err) {
        console.error(`Could not send "${subject}" email:`, err.message);
    }
}

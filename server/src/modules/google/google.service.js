// Google Calendar and Meet for professionals, over Google's REST API.
//
// A professional connects their Google account once. After that:
//   - times they are busy in their own calendar are not offered for booking
//   - confirming a session adds it to their calendar with a Meet link and
//     invites the client
//
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (an OAuth "Web application"
// client from Google Cloud, with <API_URL>/api/v1/google/callback as an
// authorised redirect URI). Without them every function here is a no-op.
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import env from "../../config/env.js";
import Professional from "../professionals/professional.model.js";

const SCOPES = [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.freebusy",
].join(" ");

export const redirectUri = () => `${env.apiUrl}/api/v1/google/callback`;

// ---- keeping the stored token safe -----------------------------------------

// The refresh token gives lasting access to someone's calendar, so it is
// encrypted before it is saved. The key is derived from JWT_SECRET.
const encryptionKey = () => crypto.createHash("sha256").update(`google-tokens:${env.JWT_SECRET}`).digest();

export function encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

export function decrypt(stored) {
    const [iv, tag, data] = stored.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// ---- connecting an account --------------------------------------------------

// `state` proves the callback belongs to the person who started the flow.
export function connectUrl(userId) {
    const state = jwt.sign({ sub: userId.toString(), purpose: "google" }, env.JWT_SECRET, { expiresIn: "10m" });
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri(),
        response_type: "code",
        scope: SCOPES,
        // offline + consent: Google only hands out a refresh token this way
        access_type: "offline",
        prompt: "consent",
        state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function readState(state) {
    const payload = jwt.verify(state, env.JWT_SECRET);
    if (payload.purpose !== "google") throw new Error("Wrong kind of token");
    return payload.sub;
}

async function tokenRequest(fields) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...fields }),
        signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Google token request failed: ${data.error || response.status}`);
    return data;
}

// Finishes the connect flow: swaps the one-time code for tokens.
export async function exchangeCode(code) {
    const tokens = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
    if (!tokens.refresh_token) throw new Error("Google did not return a refresh token");

    // The id token's payload carries the account's email. It came straight from
    // Google over TLS in this same response, so reading it without verifying
    // the signature is fine.
    let email;
    try {
        email = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString()).email;
    } catch {
        email = undefined;
    }
    return { refreshToken: tokens.refresh_token, email };
}

export async function revoke(refreshToken) {
    await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken }),
        signal: AbortSignal.timeout(15000),
    }).catch(() => {});
}

// ---- calling the Calendar API -----------------------------------------------

// Short-lived access tokens, reused until shortly before they expire.
const accessTokens = new Map();

async function accessTokenFor(professionalId) {
    const key = professionalId.toString();
    const cached = accessTokens.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const professional = await Professional.findById(professionalId).select("+google calendarConnected");
    if (!professional?.calendarConnected || !professional.google?.refreshToken) return null;

    try {
        const tokens = await tokenRequest({ refresh_token: decrypt(professional.google.refreshToken), grant_type: "refresh_token" });
        accessTokens.set(key, { token: tokens.access_token, expiresAt: Date.now() + (tokens.expires_in - 60) * 1000 });
        return tokens.access_token;
    } catch (err) {
        // "invalid_grant" means access was withdrawn on Google's side.
        if (err.message.includes("invalid_grant")) {
            await Professional.updateOne({ _id: professionalId }, { calendarConnected: false, $unset: { google: 1 } });
        }
        console.error("Google access for a professional failed:", err.message);
        return null;
    }
}

export function forget(professionalId) {
    accessTokens.delete(professionalId.toString());
    busyCache.delete(professionalId.toString());
}

async function calendarRequest(professionalId, method, path, body) {
    const token = await accessTokenFor(professionalId);
    if (!token) return null;

    const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
    });
    if (response.status === 204) return {};
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Google Calendar ${method} ${path.split("?")[0]} failed: ${data.error?.message || response.status}`);
    return data;
}

// When the professional is busy over the booking window, according to their
// own calendar. Cached briefly: profile pages are opened far more often than
// calendars change.
const busyCache = new Map();
const BUSY_CACHE_MS = 2 * 60 * 1000;
const WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

export async function busyTimes(professional) {
    if (!env.googleEnabled || !professional.calendarConnected) return [];

    const key = professional._id.toString();
    const cached = busyCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.busy;

    try {
        const data = await calendarRequest(professional._id, "POST", "/freeBusy", {
            timeMin: new Date().toISOString(),
            timeMax: new Date(Date.now() + WINDOW_MS).toISOString(),
            items: [{ id: "primary" }],
        });
        const busy = data?.calendars?.primary?.busy || [];
        busyCache.set(key, { busy, expiresAt: Date.now() + BUSY_CACHE_MS });
        return busy;
    } catch (err) {
        // If Google is unreachable, fall back to the hours set in Healing Hive
        // rather than showing no times at all.
        console.error(err.message);
        return [];
    }
}

// Adds a confirmed session to the professional's calendar with a Meet link and
// invites the client. Returns null when the calendar is not connected.
export async function createMeetEvent({ professional, session, clientEmail, professionalName }) {
    if (!env.googleEnabled || !professional.calendarConnected) return null;

    const start = new Date(session.scheduledAt);
    const end = new Date(start.getTime() + session.durationMinutes * 60 * 1000);
    const event = await calendarRequest(
        professional._id,
        "POST",
        "/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
        {
            // Deliberately vague: a calendar entry can be seen by other people.
            summary: "Healing Hive session",
            description: `Your session with ${professionalName}, booked on Healing Hive.`,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            attendees: [{ email: clientEmail }],
            guestsCanInviteOthers: false,
            guestsCanSeeOtherGuests: false,
            reminders: { useDefault: true },
            conferenceData: {
                createRequest: { requestId: session._id.toString(), conferenceSolutionKey: { type: "hangoutsMeet" } },
            },
        },
    );
    if (!event) return null;

    busyCache.delete(professional._id.toString());
    const meetingUrl = event.hangoutLink || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri;
    return { meetingUrl, googleEventId: event.id };
}

export async function deleteEvent(professionalId, googleEventId) {
    if (!env.googleEnabled || !googleEventId) return;
    try {
        await calendarRequest(professionalId, "DELETE", `/calendars/primary/events/${encodeURIComponent(googleEventId)}?sendUpdates=all`);
        busyCache.delete(professionalId.toString());
    } catch (err) {
        console.error(err.message);
    }
}

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { start, stop, reset, signUp, makeAdmin, makeProfessional } from "./setup.js";

const { outbox } = await import("../src/utils/mailer.js");
const { openSlots } = await import("../src/modules/professionals/slots.js");
const { encrypt, decrypt } = await import("../src/modules/google/google.service.js");

let api;
before(async () => { api = await start(); });
after(stop);
beforeEach(async () => { await reset(); outbox.length = 0; });

const lastMailTo = (email) => outbox.filter((mail) => mail.to === email).at(-1);

// Books the first open slot and takes the session to "completed", by moving its
// time into the past the way a real session's time would pass.
async function completedSession(therapist, client) {
    const slot = (await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.slots[0];
    const session = (await api.post("/api/v1/sessions").set(client.auth).send({ professionalId: therapist.profileId, scheduledAt: slot })).body;
    await api.patch(`/api/v1/sessions/${session._id}/status`).set(therapist.auth).send({ status: "confirmed" });
    await mongoose.model("Session").updateOne({ _id: session._id }, { scheduledAt: new Date(Date.now() - 3600000) });
    await api.patch(`/api/v1/sessions/${session._id}/status`).set(therapist.auth).send({ status: "completed" });
    return session;
}

test("password reset works once, by emailed link, and never reveals who has an account", async () => {
    const person = await signUp(api);

    const known = await api.post("/api/v1/auth/forgot-password").send({ email: person.user.email });
    const unknown = await api.post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" });
    assert.equal(known.status, 200);
    assert.deepEqual(known.body, unknown.body);
    assert.equal(lastMailTo("nobody@example.com"), undefined);

    const token = lastMailTo(person.user.email).text.match(/token=([\w-]+)/)[1];
    assert.equal((await api.post("/api/v1/auth/reset-password").send({ token: "x".repeat(43), newPassword: "brand-new-pass-1" })).status, 400);

    const done = await api.post("/api/v1/auth/reset-password").send({ token, newPassword: "brand-new-pass-1" });
    assert.equal(done.status, 200);
    assert.ok(done.body.token);
    assert.equal(done.body.user.passwordReset, undefined);

    // the link cannot be used twice, the old password is dead, the new one works
    assert.equal((await api.post("/api/v1/auth/reset-password").send({ token, newPassword: "another-pass-22" })).status, 400);
    assert.equal((await api.post("/api/v1/auth/login").send({ email: person.user.email, password: person.password })).status, 401);
    assert.equal((await api.post("/api/v1/auth/login").send({ email: person.user.email, password: "brand-new-pass-1" })).status, 200);
});

test("professionals sign up and apply in one step", async () => {
    const admin = await makeAdmin(api);
    const details = { fullName: "Dr. Achieng Otieno", email: "achieng@example.com", password: "a-good-password-1", phone: "0712 345 678" };

    // a therapist without a licence number is refused, and no half-made account is left behind
    const refused = await api.post("/api/v1/auth/register-professional").send({ ...details, application: { type: "therapist" } });
    assert.equal(refused.status, 400);
    assert.equal(refused.body.error.details[0].field, "application.licenseNumber");
    assert.equal(await mongoose.model("User").countDocuments({ email: details.email }), 0);

    // a phone number is required for professionals
    const { phone, ...noPhone } = details;
    assert.equal((await api.post("/api/v1/auth/register-professional").send({ ...noPhone, application: { type: "peer" } })).status, 400);

    const created = await api.post("/api/v1/auth/register-professional").send({ ...details, application: { type: "therapist", licenseNumber: "KCPA-777", specialties: ["Grief"] } });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.accountType, "professional");
    assert.equal(created.body.user.role, "user");
    assert.match(lastMailTo(details.email).subject, /received your/);

    const auth = { Authorization: `Bearer ${created.body.token}` };
    const mine = await api.get("/api/v1/professionals/me").set(auth);
    assert.equal(mine.body.status, "pending");
    assert.equal(mine.body.licenseNumber, "KCPA-777");

    await api.patch(`/api/v1/admin/applications/${mine.body._id}`).set(admin.auth).send({ status: "approved" });
    assert.match(lastMailTo(details.email).subject, /approved/);
    assert.equal((await api.get("/api/v1/auth/me").set(auth)).body.role, "therapist");

    // ordinary sign-up still makes a client account
    assert.equal((await signUp(api)).user.accountType, "client");
});

test("confirming a session creates a private meeting link for both people", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const client = await signUp(api);
    const slot = (await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.slots[0];

    const session = (await api.post("/api/v1/sessions").set(client.auth).send({ professionalId: therapist.profileId, scheduledAt: slot })).body;
    assert.equal(session.meetingUrl, undefined);
    assert.match(lastMailTo(therapist.user.email).subject, /New session request/);

    const confirmed = await api.patch(`/api/v1/sessions/${session._id}/status`).set(therapist.auth).send({ status: "confirmed" });
    assert.match(confirmed.body.meetingUrl, /^https:\/\/meet\.jit\.si\/HealingHive-[0-9a-f]{32}$/);
    assert.equal(confirmed.body.googleEventId, undefined);
    assert.ok(lastMailTo(client.user.email).text.includes(confirmed.body.meetingUrl));

    const mine = await api.get("/api/v1/sessions/mine").set(client.auth);
    assert.equal(mine.body[0].meetingUrl, confirmed.body.meetingUrl);

    // cancelling removes the link and tells the other person
    const cancelled = await api.patch(`/api/v1/sessions/${session._id}/status`).set(client.auth).send({ status: "cancelled" });
    assert.equal(cancelled.body.meetingUrl, undefined);
    assert.match(lastMailTo(therapist.user.email).subject, /cancelled/);
});

test("a professional's own meeting link is used when they set one, and is not public", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const client = await signUp(api);

    assert.equal((await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ meetingLink: "not a link" })).status, 400);
    await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ meetingLink: "https://meet.example.com/dr-room" });

    const profile = await api.get(`/api/v1/professionals/${therapist.profileId}`);
    assert.equal(profile.body.meetingLink, undefined);
    assert.equal((await api.get("/api/v1/professionals")).body.items[0].meetingLink, undefined);

    const session = (await api.post("/api/v1/sessions").set(client.auth).send({ professionalId: therapist.profileId, scheduledAt: profile.body.slots[0] })).body;
    const confirmed = await api.patch(`/api/v1/sessions/${session._id}/status`).set(therapist.auth).send({ status: "confirmed" });
    assert.equal(confirmed.body.meetingUrl, "https://meet.example.com/dr-room");
});

test("only the client of a completed session can rate it, and the average follows", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const client = await signUp(api);
    const other = await signUp(api);

    // not before it is completed
    const slot = (await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.slots[1];
    const pending = (await api.post("/api/v1/sessions").set(client.auth).send({ professionalId: therapist.profileId, scheduledAt: slot })).body;
    assert.equal((await api.put("/api/v1/reviews").set(client.auth).send({ sessionId: pending._id, rating: 5 })).status, 400);

    const first = await completedSession(therapist, client);
    const second = await completedSession(therapist, other);

    assert.equal((await api.put("/api/v1/reviews").set(other.auth).send({ sessionId: first._id, rating: 1 })).status, 404);
    assert.equal((await api.put("/api/v1/reviews").set(therapist.auth).send({ sessionId: first._id, rating: 5 })).status, 404);
    assert.equal((await api.put("/api/v1/reviews").set(client.auth).send({ sessionId: first._id, rating: 9 })).status, 400);

    assert.equal((await api.put("/api/v1/reviews").set(client.auth).send({ sessionId: first._id, rating: 5, comment: "Felt heard." })).status, 200);
    assert.equal((await api.put("/api/v1/reviews").set(other.auth).send({ sessionId: second._id, rating: 4 })).status, 200);
    // rating again changes the same review rather than adding one
    assert.equal((await api.put("/api/v1/reviews").set(other.auth).send({ sessionId: second._id, rating: 2 })).status, 200);

    const profile = await api.get(`/api/v1/professionals/${therapist.profileId}`);
    assert.equal(profile.body.ratingCount, 2);
    assert.equal(profile.body.ratingAverage, 3.5);

    // public reviews carry no names or ids of who wrote them
    const reviews = await api.get(`/api/v1/professionals/${therapist.profileId}/reviews`);
    assert.equal(reviews.body.length, 2);
    assert.deepEqual(Object.keys(reviews.body[0]).sort(), ["_id", "comment", "createdAt", "rating"].filter((key) => key in reviews.body[0]).sort());
    assert.equal(reviews.body.some((review) => "client" in review || "session" in review), false);

    const mine = await api.get("/api/v1/sessions/mine").set(client.auth);
    assert.equal(mine.body.find((session) => session._id === first._id).review.rating, 5);
});

test("an institution invites professionals, who must accept, and sees numbers but not clients", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const client = await signUp(api);

    const created = await api.post("/api/v1/auth/register-professional").send({
        fullName: "Mary Wambui", email: "admin@mindful.example", password: "a-good-password-1", phone: "0711 000 111",
        application: { type: "institution", organisationName: "Mindful Health Institute" },
    });
    const institution = { auth: { Authorization: `Bearer ${created.body.token}` } };
    const institutionId = (await api.get("/api/v1/professionals/me").set(institution.auth)).body._id;

    // not approved yet, and never listed as someone to book
    assert.equal((await api.get("/api/v1/institutions/me").set(institution.auth)).status, 403);
    await api.patch(`/api/v1/admin/applications/${institutionId}`).set(admin.auth).send({ status: "approved" });
    assert.equal((await api.get("/api/v1/professionals")).body.total, 1);
    assert.equal((await api.get(`/api/v1/professionals/${institutionId}`)).status, 404);
    assert.equal((await api.get("/api/v1/institutions/me").set(therapist.auth)).status, 403);

    assert.equal((await api.post("/api/v1/institutions/me/members").set(institution.auth).send({ email: client.user.email })).status, 400);
    const invited = await api.post("/api/v1/institutions/me/members").set(institution.auth).send({ email: therapist.user.email });
    assert.equal(invited.status, 201);
    assert.match(lastMailTo(therapist.user.email).subject, /Mindful Health Institute invited you/);
    assert.equal((await api.post("/api/v1/institutions/me/members").set(institution.auth).send({ email: therapist.user.email })).status, 409);

    // an invitation alone shows nothing publicly
    let dashboard = (await api.get("/api/v1/institutions/me").set(institution.auth)).body;
    assert.equal(dashboard.totals.members, 0);
    assert.equal(dashboard.totals.invited, 1);
    assert.equal((await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.institution, undefined);

    const accepted = await api.post("/api/v1/professionals/me/institution").set(therapist.auth).send({ accept: true });
    assert.equal(accepted.body.institutionStatus, "active");
    assert.equal((await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.institution.organisationName, "Mindful Health Institute");

    await completedSession(therapist, client);
    dashboard = (await api.get("/api/v1/institutions/me").set(institution.auth)).body;
    assert.equal(dashboard.totals.members, 1);
    assert.equal(dashboard.totals.completed, 1);
    assert.equal(dashboard.totals.completedValue, 3000);
    assert.equal(dashboard.members[0].stats.clients, 1);
    // counts only: no client names, ids, notes or meeting links
    const raw = JSON.stringify(dashboard);
    assert.equal(raw.includes(client.user._id), false);
    assert.equal(raw.includes(client.user.fullName), false);
    assert.equal(raw.includes("meetingUrl"), false);

    // the professional can leave, and the institution can remove
    await api.post("/api/v1/professionals/me/institution").set(therapist.auth).send({ accept: false });
    assert.equal((await api.get("/api/v1/institutions/me").set(institution.auth)).body.members.length, 0);
    await api.post("/api/v1/institutions/me/members").set(institution.auth).send({ email: therapist.user.email });
    assert.equal((await api.delete(`/api/v1/institutions/me/members/${therapist.profileId}`).set(institution.auth)).status, 200);
    assert.equal((await api.get("/api/v1/professionals/me").set(therapist.auth)).body.institution, undefined);
});

test("times that clash with the professional's own calendar are not offered", () => {
    // Monday 5 Jan 2026, 06:00 EAT, with working hours 09:00 to 12:00 on Mondays
    const now = new Date("2026-01-05T03:00:00Z");
    const professional = { sessionMinutes: 60, availability: [{ day: 1, start: 540, end: 720 }] };
    const times = (busy) => openSlots(professional, [], now, busy).slice(0, 3).map((slot) => slot.toISOString());

    assert.deepEqual(times([]), ["2026-01-05T06:00:00.000Z", "2026-01-05T07:00:00.000Z", "2026-01-05T08:00:00.000Z"]);
    // a calendar event 10:30 to 11:15 EAT knocks out the 10:00 and 11:00 sessions it overlaps
    assert.deepEqual(times([{ start: "2026-01-05T07:30:00Z", end: "2026-01-05T08:15:00Z" }]).slice(0, 1), ["2026-01-05T06:00:00.000Z"]);
    assert.equal(times([{ start: "2026-01-05T07:30:00Z", end: "2026-01-05T08:15:00Z" }]).includes("2026-01-05T07:00:00.000Z"), false);
    assert.equal(times([{ start: "2026-01-05T07:30:00Z", end: "2026-01-05T08:15:00Z" }]).includes("2026-01-05T08:00:00.000Z"), false);
    // an event that ends exactly when a session starts does not block it
    assert.equal(times([{ start: "2026-01-05T05:00:00Z", end: "2026-01-05T06:00:00Z" }])[0], "2026-01-05T06:00:00.000Z");
});

test("stored Google tokens are encrypted and tamper-evident", () => {
    const stored = encrypt("1//refresh-token-value");
    assert.equal(stored.includes("refresh-token-value"), false);
    assert.equal(decrypt(stored), "1//refresh-token-value");
    assert.notEqual(encrypt("1//refresh-token-value"), stored);
    const [iv, tag, data] = stored.split(".");
    assert.throws(() => decrypt([iv, tag, data.slice(0, -2) + "AA"].join(".")));
});

test("the Google Calendar option reports as unavailable until it is configured", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const status = await api.get("/api/v1/google/status").set(therapist.auth);
    assert.deepEqual(status.body, { available: false, connected: false });
    assert.equal((await api.get("/api/v1/google/connect").set(therapist.auth)).status, 503);
    const client = await signUp(api);
    assert.equal((await api.get("/api/v1/google/connect").set(client.auth)).status, 403);
});

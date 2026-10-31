import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { start, stop, reset, signUp, makeAdmin, makeProfessional, uploadCertificate, PDF } from "./setup.js";

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

test("changing a password cancels a reset link already sent", async () => {
    const person = await signUp(api);
    await api.post("/api/v1/auth/forgot-password").send({ email: person.user.email });
    const token = lastMailTo(person.user.email).text.match(/token=([\w-]+)/)[1];
    const changed = await api.post("/api/v1/auth/change-password").set(person.auth).send({ currentPassword: person.password, newPassword: "brand-new-pass-1" });
    assert.equal(changed.status, 200);
    assert.equal((await api.post("/api/v1/auth/reset-password").send({ token, newPassword: "another-new-pass-2" })).status, 400);
});

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
    // the one step left, and where to do it
    assert.match(lastMailTo(details.email).text, /upload your certificate.*\/practice/s);

    const auth = { Authorization: `Bearer ${created.body.token}` };
    const mine = await api.get("/api/v1/professionals/me").set(auth);
    assert.equal(mine.body.status, "pending");
    assert.equal(mine.body.licenseNumber, "KCPA-777");
    assert.equal(mine.body.certificate, null);

    await uploadCertificate(api, { auth });
    await api.patch(`/api/v1/admin/applications/${mine.body._id}`).set(admin.auth).send({ status: "approved" });
    assert.match(lastMailTo(details.email).subject, /approved/);
    assert.equal((await api.get("/api/v1/auth/me").set(auth)).body.role, "therapist");

    // ordinary sign-up still makes a client account
    assert.equal((await signUp(api)).user.accountType, "client");
});

test("a certificate is private to its professional and admins, and only real PDF, JPEG or PNG files are taken", async () => {
    const admin = await makeAdmin(api);
    const applicant = await signUp(api);
    const other = await signUp(api);
    const application = (await api.post("/api/v1/professionals/apply").set(applicant.auth).send({ type: "peer" })).body;
    const put = (person, body, contentType, filename = "cert.pdf") => api.put("/api/v1/professionals/me/certificate").set(person.auth)
        .set("Content-Type", contentType).set("X-Filename", encodeURIComponent(filename)).send(body);

    // only the three kinds of file, and only when they really are that kind
    assert.equal((await put(applicant, Buffer.from("just text"), "text/plain")).status, 415);
    assert.equal((await put(applicant, Buffer.from("MZ not a pdf at all"), "application/pdf")).status, 400);
    assert.equal((await put(applicant, Buffer.from("%PDF-1.4"), "image/png")).status, 400);
    assert.equal((await put(applicant, Buffer.alloc(5 * 1024 * 1024 + 1, 0x25), "application/pdf")).status, 413);
    // someone without an application has nothing to attach it to
    assert.equal((await put(other, PDF, "application/pdf")).status, 404);

    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest of the image")]);
    const saved = await put(applicant, png, "image/png", "../../My Certificate \"2026\".png");
    assert.equal(saved.status, 200);
    assert.deepEqual([saved.body.filename, saved.body.contentType, saved.body.size], ["My Certificate 2026.png", "image/png", png.length]);
    // a second upload replaces the first
    await uploadCertificate(api, applicant);
    assert.equal((await api.get("/api/v1/professionals/me").set(applicant.auth)).body.certificate.filename, "certificate.pdf");

    // the owner and admins can download it, as a download; nobody else can
    const mine = await api.get("/api/v1/professionals/me/certificate").set(applicant.auth).buffer(true).parse((res, done) => { const parts = []; res.on("data", (part) => parts.push(part)); res.on("end", () => done(null, Buffer.concat(parts))); });
    assert.equal(mine.status, 200);
    assert.ok(mine.body.equals(PDF));
    assert.match(mine.headers["content-disposition"], /^attachment;/);
    assert.equal(mine.headers["cache-control"], "private, no-store");
    assert.equal((await api.get(`/api/v1/admin/applications/${application._id}/certificate`).set(admin.auth)).status, 200);
    assert.equal((await api.get(`/api/v1/admin/applications/${application._id}/certificate`).set(other.auth)).status, 403);
    assert.equal((await api.get("/api/v1/professionals/me/certificate").set(other.auth)).status, 404);
    assert.equal((await api.get(`/api/v1/admin/applications/${application._id}/certificate`)).status, 401);

    // the admin's list says there is one, without sending the file
    const listed = (await api.get("/api/v1/admin/applications").set(admin.auth)).body.find((item) => item._id === application._id);
    assert.equal(listed.certificate.filename, "certificate.pdf");
    assert.equal(listed.certificate.data, undefined);

    // sent back for changes, a new certificate puts the application back in the queue
    await api.patch(`/api/v1/admin/applications/${application._id}`).set(admin.auth).send({ status: "rejected", reviewNote: "The scan is blurry" });
    await uploadCertificate(api, applicant);
    const resent = (await api.get("/api/v1/professionals/me").set(applicant.auth)).body;
    assert.equal(resent.status, "pending");
    assert.equal(resent.reviewNote, undefined);

    // once approved, it was what got them listed, so it stays as it is
    assert.equal((await api.patch(`/api/v1/admin/applications/${application._id}`).set(admin.auth).send({ status: "approved" })).status, 200);
    assert.equal((await put(applicant, PDF, "application/pdf")).status, 409);

    // institutions are verified in other ways and don't upload one
    const institution = await signUp(api);
    await api.post("/api/v1/professionals/apply").set(institution.auth).send({ type: "institution", organisationName: "Campus Wellness" });
    assert.equal((await put(institution, PDF, "application/pdf")).status, 400);
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

test("a professional can take their years of experience off their profile", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);

    assert.equal((await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ yearsExperience: 6 })).status, 200);
    assert.equal((await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.yearsExperience, 6);
    // the form sends null for an emptied box; leaving the field out keeps it
    assert.equal((await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ yearsExperience: null })).status, 200);
    assert.equal((await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.yearsExperience, undefined);
    await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ yearsExperience: 4 });
    await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ bio: "Listening first." });
    assert.equal((await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.yearsExperience, 4);
});

test("a professional's own meeting link is used when they set one, and is not public", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const client = await signUp(api);

    assert.equal((await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ meetingLink: "not a link" })).status, 400);
    // It becomes the client's Join link, so only web addresses are accepted
    for (const meetingLink of ["javascript:alert(1)", "data:text/html,<p>hi</p>", "ftp://files.example.com/room"]) {
        assert.equal((await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ meetingLink })).status, 400, meetingLink);
    }
    await api.patch("/api/v1/professionals/me").set(therapist.auth).send({ meetingLink: "https://meet.example.com/dr-room" });

    const profile = await api.get(`/api/v1/professionals/${therapist.profileId}`);
    assert.equal(profile.body.meetingLink, undefined);
    assert.equal(profile.body.calendarConnected, undefined);
    const listed = (await api.get("/api/v1/professionals")).body.items[0];
    assert.equal(listed.meetingLink, undefined);
    assert.equal(listed.calendarConnected, undefined);

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

    // rating again without the comment takes the comment down
    assert.equal((await api.put("/api/v1/reviews").set(client.auth).send({ sessionId: first._id, rating: 4 })).status, 200);
    const after = await api.get(`/api/v1/professionals/${therapist.profileId}/reviews`);
    assert.equal(after.body.some((review) => review.comment), false);
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
    // invited again, with a completed session on record: no numbers until they accept
    dashboard = (await api.get("/api/v1/institutions/me").set(institution.auth)).body;
    assert.equal(dashboard.members[0].institutionStatus, "invited");
    assert.equal(dashboard.members[0].stats, undefined);
    assert.equal(dashboard.totals.completed, 0);
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
    // Flip one bit, so the tampered copy always differs from the original
    const flip = (part) => {
        const bytes = Buffer.from(part, "base64url");
        bytes[0] ^= 1;
        return bytes.toString("base64url");
    };
    const [iv, tag, data] = stored.split(".");
    assert.throws(() => decrypt([iv, tag, flip(data)].join(".")));
    assert.throws(() => decrypt([iv, flip(tag), data].join(".")));
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

test("a booking blocks every slot it overlaps, even after the session length changes", () => {
    // Monday 5 Jan 2026, 06:00 EAT, working hours 09:00 to 13:00 on Mondays
    const now = new Date("2026-01-05T03:00:00Z");
    const times = (sessionMinutes, taken) => openSlots({ sessionMinutes, availability: [{ day: 1, start: 540, end: 780 }] }, taken, now)
        .filter((slot) => slot < new Date("2026-01-05T10:00:00Z"))
        .map((slot) => slot.toISOString().slice(11, 16));

    // Booked 09:50 to 10:40 EAT while sessions were 50 minutes long
    const booked = [{ scheduledAt: new Date("2026-01-05T06:50:00Z"), durationMinutes: 50 }];
    assert.deepEqual(times(50, booked), ["06:00", "07:40", "08:30"]);
    // Now 60 minutes long: 09:00 (until 10:00) and 10:00 EAT both overlap the
    // booking, so only 11:00 and 12:00 EAT are offered
    assert.deepEqual(times(60, booked), ["08:00", "09:00"]);
});

test("removing a professional cancels their upcoming sessions and tells each client", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const first = await signUp(api);
    const second = await signUp(api);
    const [slotA, slotB] = (await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.slots;

    const confirmed = (await api.post("/api/v1/sessions").set(first.auth).send({ professionalId: therapist.profileId, scheduledAt: slotA })).body;
    await api.patch(`/api/v1/sessions/${confirmed._id}/status`).set(therapist.auth).send({ status: "confirmed" });
    await api.post("/api/v1/sessions").set(second.auth).send({ professionalId: therapist.profileId, scheduledAt: slotB });

    // a confirmed session that started ten minutes ago is stopped too,
    // and one that has already ended is left as it was
    const Session = mongoose.model("Session");
    const third = await signUp(api);
    const fourth = await signUp(api);
    const [slotC, slotD] = (await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.slots;
    const underWay = (await api.post("/api/v1/sessions").set(third.auth).send({ professionalId: therapist.profileId, scheduledAt: slotC })).body;
    const ended = (await api.post("/api/v1/sessions").set(fourth.auth).send({ professionalId: therapist.profileId, scheduledAt: slotD })).body;
    for (const session of [underWay, ended]) await api.patch(`/api/v1/sessions/${session._id}/status`).set(therapist.auth).send({ status: "confirmed" });
    await Session.updateOne({ _id: underWay._id }, { scheduledAt: new Date(Date.now() - 10 * 60 * 1000) });
    await Session.updateOne({ _id: ended._id }, { scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000) });

    const removed = await api.patch(`/api/v1/admin/applications/${therapist.profileId}`).set(admin.auth).send({ status: "rejected", reviewNote: "Licence expired" });
    const told = outbox.find((mail) => mail.to === therapist.user.email && /removed from the Healing Hive directory/.test(mail.subject));
    assert.match(told.text, /no longer listed/);
    assert.match(told.text, /Why: Licence expired/);
    assert.equal(removed.status, 200);

    for (const client of [first, second, third]) {
        const [session] = (await api.get("/api/v1/sessions/mine").set(client.auth)).body;
        assert.equal(session.status, "cancelled");
        assert.equal(session.meetingUrl, undefined);
        assert.match(lastMailTo(client.user.email).text, /no longer listed/);
    }
    const [past] = (await api.get("/api/v1/sessions/mine").set(fourth.auth)).body;
    assert.equal(past.status, "confirmed");
    assert.doesNotMatch(lastMailTo(fourth.user.email)?.text || "", /no longer listed/);
});

test("admins can search everyone and page through them", async () => {
    const admin = await makeAdmin(api);
    const User = mongoose.model("User");
    await User.insertMany(Array.from({ length: 55 }, (_, i) => ({ fullName: `Member ${i}`, email: `member${i}@paging.test`, password: "x".repeat(60) })));
    await User.create({ fullName: "Achieng Otieno", email: "achieng@example.com", password: "x".repeat(60) });

    const first = await api.get("/api/v1/admin/users").set(admin.auth);
    assert.equal(first.status, 200);
    assert.equal(first.body.items.length, 50);
    assert.equal(first.body.items[0].email, "achieng@example.com");
    assert.equal(first.body.pages, 2);
    const second = await api.get("/api/v1/admin/users?page=2").set(admin.auth);
    assert.equal(second.body.items.length, first.body.total - 50);

    const found = await api.get("/api/v1/admin/users?q=ACHIENG").set(admin.auth);
    assert.deepEqual(found.body.items.map((u) => u.fullName), ["Achieng Otieno"]);
    const byEmail = await api.get("/api/v1/admin/users?q=member1").set(admin.auth);
    assert.ok(byEmail.body.items.every((u) => u.email.startsWith("member1")));
    // the search is text, not a pattern
    assert.equal((await api.get("/api/v1/admin/users?q=.*").set(admin.auth)).body.total, 0);
    assert.equal(byEmail.body.items[0].password, undefined);
});

test("the Google callback says when Google Calendar is not set up on this server", async () => {
    const res = await api.get("/api/v1/google/callback?code=abc&state=anything");
    assert.equal(res.status, 302);
    assert.equal(new URL(res.headers.location).searchParams.get("calendar"), "unavailable");
});

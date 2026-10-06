import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { start, stop, reset, signUp, makeAdmin, makeProfessional } from "./setup.js";

let api;
before(async () => { api = await start(); });
after(stop);
beforeEach(reset);

test("journal entries are private to their owner", async () => {
    const owner = await signUp(api);
    const other = await signUp(api);
    const admin = await makeAdmin(api);

    const entry = await api.post("/api/v1/journal").set(owner.auth).send({ title: "Today", content: "A hard day.", mood: 2 });
    assert.equal(entry.status, 201);

    assert.equal((await api.get("/api/v1/journal").set(other.auth)).body.length, 0);
    assert.equal((await api.get("/api/v1/journal").set(admin.auth)).body.length, 0);
    assert.equal((await api.put(`/api/v1/journal/${entry.body._id}`).set(other.auth).send({ content: "hijacked" })).status, 404);
    assert.equal((await api.delete(`/api/v1/journal/${entry.body._id}`).set(other.auth)).status, 404);

    // and the owner field cannot be reassigned through the body
    const sneaky = await api.post("/api/v1/journal").set(other.auth).send({ content: "mine", user: owner.user._id });
    assert.equal(sneaky.status, 201);
    assert.equal((await api.get("/api/v1/journal").set(owner.auth)).body.length, 1);
});

test("mood check-ins are saved and scoped to the person", async () => {
    const person = await signUp(api);
    const other = await signUp(api);

    assert.equal((await api.post("/api/v1/moods").set(person.auth).send({ score: 9 })).status, 400);
    assert.equal((await api.post("/api/v1/moods").set(person.auth).send({ score: 4, note: "Good walk" })).status, 201);

    assert.equal((await api.get("/api/v1/moods").set(person.auth)).body.length, 1);
    assert.equal((await api.get("/api/v1/moods").set(other.auth)).body.length, 0);
});

test("reminders are served from the reminders route and can be switched off", async () => {
    const person = await signUp(api);
    const created = await api.post("/api/v1/reminders").set(person.auth)
        .send({ message: "Drink water", time: 480, days: [1, 2, 3], channels: ["app", "sms"] });
    assert.equal(created.status, 201);

    const off = await api.patch(`/api/v1/reminders/${created.body._id}`).set(person.auth).send({ enabled: false });
    assert.equal(off.body.enabled, false);
    // a partial update leaves the other fields alone
    assert.deepEqual(off.body.channels, ["app", "sms"]);
    assert.equal(off.body.message, "Drink water");

    const list = await api.get("/api/v1/reminders").set(person.auth);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].message, "Drink water");
});

test("nuggets from professionals wait for an admin before going public", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const reader = await signUp(api);
    const draft = { title: "Sleep and mood", content: "Sleep and mood affect each other in both directions.", topic: "Mental Health Basics" };

    assert.equal((await api.post("/api/v1/nuggets").set(reader.auth).send(draft)).status, 403);

    // a professional asking for "published" still lands in review
    const submitted = await api.post("/api/v1/nuggets").set(therapist.auth).send({ ...draft, status: "published" });
    assert.equal(submitted.status, 201);
    assert.equal(submitted.body.status, "review");
    assert.equal((await api.get("/api/v1/nuggets")).body.total, 0);
    assert.equal((await api.get(`/api/v1/nuggets/${submitted.body._id}`)).status, 404);
    assert.equal((await api.get("/api/v1/nuggets?status=review").set(reader.auth)).body.total, 0);
    assert.equal((await api.get("/api/v1/nuggets?status=review").set(admin.auth)).body.total, 1);

    await api.patch(`/api/v1/nuggets/${submitted.body._id}`).set(admin.auth).send({ status: "published" });
    assert.equal((await api.get("/api/v1/nuggets")).body.total, 1);
    assert.equal((await api.get("/api/v1/nuggets/today")).body.title, "Sleep and mood");

    await api.put(`/api/v1/nuggets/${submitted.body._id}/save`).set(reader.auth);
    assert.equal((await api.get("/api/v1/nuggets/saved").set(reader.auth)).body.length, 1);
    assert.deepEqual((await api.get("/api/v1/auth/me").set(reader.auth)).body.savedNuggets, [submitted.body._id]);
});

test("events respect capacity and hide who else is going", async () => {
    const admin = await makeAdmin(api);
    const first = await signUp(api);
    const second = await signUp(api);

    const event = await api.post("/api/v1/events").set(admin.auth).send({
        title: "Group breathing session",
        eventDate: new Date(Date.now() + 86400000).toISOString(),
        capacity: 1,
        joinLink: "https://meet.example.com/abc",
    });
    assert.equal(event.status, 201);
    assert.equal((await api.post("/api/v1/events").set(first.auth).send({ title: "Not allowed", eventDate: new Date().toISOString() })).status, 403);

    const publicView = await api.get(`/api/v1/events/${event.body._id}`);
    assert.equal(publicView.body.participants, undefined);
    assert.equal(publicView.body.joinLink, undefined);

    const joined = await api.post(`/api/v1/events/${event.body._id}/join`).set(first.auth);
    assert.equal(joined.body.joined, true);
    assert.equal(joined.body.joinLink, "https://meet.example.com/abc");
    // joining twice is harmless
    assert.equal((await api.post(`/api/v1/events/${event.body._id}/join`).set(first.auth)).body.participantCount, 1);

    assert.equal((await api.post(`/api/v1/events/${event.body._id}/join`).set(second.auth)).status, 409);
    assert.equal((await api.post("/api/v1/events/000000000000000000000000/join").set(second.auth)).status, 404);
});

test("the AI companion always answers a crisis message with help contacts", async () => {
    const person = await signUp(api);

    // no API key in tests, so ordinary messages report that the companion is off...
    const ordinary = await api.post("/api/v1/ai/messages").set(person.auth).send({ message: "I had a long day" });
    assert.equal(ordinary.status, 503);
    assert.equal(ordinary.body.error.code, "AI_NOT_CONFIGURED");

    // ...but a crisis message still gets a safe reply and the contacts
    const crisis = await api.post("/api/v1/ai/messages").set(person.auth).send({ message: "I want to kill myself" });
    assert.equal(crisis.status, 201);
    assert.equal(crisis.body.crisis, true);
    assert.match(crisis.body.reply.message, /999/);
    assert.ok(crisis.body.contacts.length > 0);

    const history = await api.get("/api/v1/ai/messages").set(person.auth);
    assert.equal(history.body.available, false);
    assert.deepEqual(history.body.messages.map((m) => m.role), ["user", "assistant"]);

    await api.delete("/api/v1/ai/messages").set(person.auth);
    assert.equal((await api.get("/api/v1/ai/messages").set(person.auth)).body.messages.length, 0);
});

test("unknown routes and malformed ids return clean errors", async () => {
    assert.equal((await api.get("/api/v1/nope")).status, 404);
    assert.equal((await api.get("/api/v1/nuggets/not-an-id")).status, 404);
    const res = await api.post("/api/v1/auth/login").set("Content-Type", "application/json").send("{bad json");
    assert.equal(res.status, 400);
});

test("editing a nugget or event leaves the fields you did not send alone", async () => {
    const admin = await makeAdmin(api);

    const nugget = await api.post("/api/v1/nuggets").set(admin.auth)
        .send({ title: "Rest matters", content: "Rest is part of the work, not a break from it.", topic: "Daily Affirmations", type: "affirmation", readMinutes: 4 });
    const renamed = await api.patch(`/api/v1/nuggets/${nugget.body._id}`).set(admin.auth).send({ title: "Rest really matters" });
    assert.equal(renamed.body.type, "affirmation");
    assert.equal(renamed.body.readMinutes, 4);

    const event = await api.post("/api/v1/events").set(admin.auth)
        .send({ title: "Paid workshop", eventDate: new Date(Date.now() + 86400000).toISOString(), price: 500, durationMinutes: 90 });
    const moved = await api.patch(`/api/v1/events/${event.body._id}`).set(admin.auth).send({ speaker: "A. Speaker" });
    assert.equal(moved.body.price, 500);
    assert.equal(moved.body.durationMinutes, 90);
});

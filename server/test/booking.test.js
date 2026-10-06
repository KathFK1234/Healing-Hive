import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { start, stop, reset, signUp, makeAdmin, makeProfessional } from "./setup.js";

let api;
before(async () => { api = await start(); });
after(stop);
beforeEach(reset);

test("a professional is only listed after an admin approves them", async () => {
    const admin = await makeAdmin(api);
    const applicant = await signUp(api);

    const application = await api.post("/api/v1/professionals/apply").set(applicant.auth)
        .send({ type: "peer", bio: "Trained peer counsellor" });
    assert.equal(application.status, 201);
    assert.equal(application.body.status, "pending");

    let directory = await api.get("/api/v1/professionals");
    assert.equal(directory.body.total, 0);
    assert.equal((await api.get(`/api/v1/professionals/${application.body._id}`)).status, 404);

    // applicants cannot approve themselves
    const selfApprove = await api.patch(`/api/v1/admin/applications/${application.body._id}`).set(applicant.auth).send({ status: "approved" });
    assert.equal(selfApprove.status, 403);

    await api.patch(`/api/v1/admin/applications/${application.body._id}`).set(admin.auth).send({ status: "approved" });
    directory = await api.get("/api/v1/professionals");
    assert.equal(directory.body.total, 1);
    assert.equal(directory.body.items[0].licenseNumber, undefined);

    const me = await api.get("/api/v1/auth/me").set(applicant.auth);
    assert.equal(me.body.role, "peer");
});

test("therapists must give a licence number to apply", async () => {
    const applicant = await signUp(api);
    const res = await api.post("/api/v1/professionals/apply").set(applicant.auth).send({ type: "therapist" });
    assert.equal(res.status, 400);
});

test("booking takes the slot, and nobody else can book it", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const client = await signUp(api);
    const other = await signUp(api);

    const profile = await api.get(`/api/v1/professionals/${therapist.profileId}`);
    assert.ok(profile.body.slots.length > 0);
    const slot = profile.body.slots[0];

    const booked = await api.post("/api/v1/sessions").set(client.auth).send({ professionalId: therapist.profileId, scheduledAt: slot });
    assert.equal(booked.status, 201);
    assert.equal(booked.body.status, "pending");
    assert.equal(booked.body.price.amount, 3000);

    const clash = await api.post("/api/v1/sessions").set(other.auth).send({ professionalId: therapist.profileId, scheduledAt: slot });
    assert.equal(clash.status, 409);

    const after = await api.get(`/api/v1/professionals/${therapist.profileId}`);
    assert.ok(!after.body.slots.includes(slot));

    // cancelling frees the slot again
    const cancelled = await api.patch(`/api/v1/sessions/${booked.body._id}/status`).set(client.auth).send({ status: "cancelled" });
    assert.equal(cancelled.status, 200);
    const rebook = await api.post("/api/v1/sessions").set(other.auth).send({ professionalId: therapist.profileId, scheduledAt: slot });
    assert.equal(rebook.status, 201);
});

test("two people booking the same slot at the same moment: exactly one succeeds", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const people = await Promise.all([signUp(api), signUp(api), signUp(api)]);
    const slot = (await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.slots[0];

    const results = await Promise.all(people.map((person) =>
        api.post("/api/v1/sessions").set(person.auth).send({ professionalId: therapist.profileId, scheduledAt: slot })
    ));
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409]);
});

test("times outside the professional's hours cannot be booked", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const client = await signUp(api);

    const res = await api.post("/api/v1/sessions").set(client.auth)
        .send({ professionalId: therapist.profileId, scheduledAt: new Date(Date.now() + 60 * 1000).toISOString() });
    assert.equal(res.status, 409);
});

test("only the people in a session can see or change it", async () => {
    const admin = await makeAdmin(api);
    const therapist = await makeProfessional(api, admin);
    const otherTherapist = await makeProfessional(api, admin, { licenseNumber: "KCPA-0002" });
    const client = await signUp(api);
    const stranger = await signUp(api);
    const slot = (await api.get(`/api/v1/professionals/${therapist.profileId}`)).body.slots[0];
    const session = (await api.post("/api/v1/sessions").set(client.auth).send({ professionalId: therapist.profileId, scheduledAt: slot })).body;

    // a different therapist cannot touch it (the old API let any therapist do this)
    const hijack = await api.patch(`/api/v1/sessions/${session._id}/status`).set(otherTherapist.auth).send({ status: "confirmed" });
    assert.equal(hijack.status, 404);
    assert.equal((await api.patch(`/api/v1/sessions/${session._id}/status`).set(stranger.auth).send({ status: "cancelled" })).status, 404);

    // clients cannot confirm their own booking
    assert.equal((await api.patch(`/api/v1/sessions/${session._id}/status`).set(client.auth).send({ status: "confirmed" })).status, 400);

    const confirmed = await api.patch(`/api/v1/sessions/${session._id}/status`).set(therapist.auth).send({ status: "confirmed" });
    assert.equal(confirmed.status, 200);

    // private notes are for the professional only
    await api.put(`/api/v1/sessions/${session._id}/notes`).set(therapist.auth).send({ privateNotes: "Follow up on sleep" });
    const assigned = await api.get("/api/v1/sessions/assigned").set(therapist.auth);
    assert.equal(assigned.body[0].privateNotes, "Follow up on sleep");
    const mine = await api.get("/api/v1/sessions/mine").set(client.auth);
    assert.equal(mine.body.length, 1);
    assert.equal(mine.body[0].privateNotes, undefined);
    assert.equal((await api.get("/api/v1/sessions/mine").set(stranger.auth)).body.length, 0);
});

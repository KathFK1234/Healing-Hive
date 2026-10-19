import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Google switched on for this file only (each test file runs in its own process).
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
const { start, stop, reset, signUp, makeAdmin, makeProfessional } = await import("./setup.js");
const { connectUrl, encrypt } = await import("../src/modules/google/google.service.js");
const { default: mongoose } = await import("mongoose");

let api;
before(async () => { api = await start(); });
after(stop);
beforeEach(reset);

const stateFor = (userId) => new URL(connectUrl(userId)).searchParams.get("state");
const result = (res) => new URL(res.headers.location).searchParams.get("calendar");

test("the Google callback says why a calendar was not connected", async () => {
    assert.equal(result(await api.get("/api/v1/google/callback?error=access_denied")), "cancelled");
    assert.equal(result(await api.get("/api/v1/google/callback?code=abc&state=not-a-token")), "expired");

    const applicant = await signUp(api);
    assert.equal(result(await api.get(`/api/v1/google/callback?code=abc&state=${stateFor(applicant.user._id)}`)), "not-approved");

    const professional = await makeProfessional(api, await makeAdmin(api));
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    try {
        const res = await api.get(`/api/v1/google/callback?code=abc&state=${stateFor(professional.user._id)}`);
        assert.equal(res.status, 302);
        assert.equal(result(res), "refused");
    } finally {
        globalThis.fetch = realFetch;
    }
});

test("the directory's next free time leaves out calendar busy times, like the profile page", async () => {
    const professional = await makeProfessional(api, await makeAdmin(api));
    await mongoose.model("Professional").updateOne(
        { _id: professional.profileId },
        { calendarConnected: true, google: { refreshToken: encrypt("refresh-token") } },
    );
    // Busy in Google for the next three days
    const busyUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    let freeBusyCalls = 0;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
        if (String(url).startsWith("https://oauth2.googleapis.com/token")) {
            return new Response(JSON.stringify({ access_token: "access", expires_in: 3600 }));
        }
        freeBusyCalls++;
        return new Response(JSON.stringify({ calendars: { primary: { busy: [{ start: new Date().toISOString(), end: busyUntil.toISOString() }] } } }));
    };
    try {
        const listed = (await api.get("/api/v1/professionals")).body.items.find((p) => p._id === professional.profileId);
        const profile = (await api.get(`/api/v1/professionals/${professional.profileId}`)).body;
        assert.equal(freeBusyCalls, 1, "the directory asked Google, and the profile page reused it");
        assert.ok(new Date(listed.nextAvailable) >= busyUntil);
        assert.equal(listed.nextAvailable, profile.nextAvailable);
        assert.equal(listed.calendarConnected, undefined);
    } finally {
        globalThis.fetch = realFetch;
    }
});

test("a slow Google reply does not hold up the directory", async () => {
    const professional = await makeProfessional(api, await makeAdmin(api));
    await mongoose.model("Professional").updateOne(
        { _id: professional.profileId },
        { calendarConnected: true, google: { refreshToken: encrypt("refresh-token") } },
    );
    const busyUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
        if (String(url).startsWith("https://oauth2.googleapis.com/token")) {
            return new Response(JSON.stringify({ access_token: "access", expires_in: 3600 }));
        }
        await new Promise((resolve) => setTimeout(resolve, 4500));
        return new Response(JSON.stringify({ calendars: { primary: { busy: [{ start: new Date().toISOString(), end: busyUntil.toISOString() }] } } }));
    };
    try {
        const started = Date.now();
        const listed = (await api.get("/api/v1/professionals")).body.items.find((p) => p._id === professional.profileId);
        assert.ok(Date.now() - started < 4000, "answered without waiting for Google");
        assert.ok(listed.nextAvailable, "still shows a time from the hours set in Healing Hive");

        // The lookup carried on; once it is in, both pages leave the busy time out
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const again = (await api.get("/api/v1/professionals")).body.items.find((p) => p._id === professional.profileId);
        assert.ok(new Date(again.nextAvailable) >= busyUntil);
    } finally {
        globalThis.fetch = realFetch;
    }
});

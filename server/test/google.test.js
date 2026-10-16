import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Google switched on for this file only (each test file runs in its own process).
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
const { start, stop, reset, signUp, makeAdmin, makeProfessional } = await import("./setup.js");
const { connectUrl } = await import("../src/modules/google/google.service.js");

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

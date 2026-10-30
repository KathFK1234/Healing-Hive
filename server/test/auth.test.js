import { test, before, after, beforeEach } from "node:test";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import { start, stop, reset, signUp } from "./setup.js";
import { healthAnswer } from "../src/routes.js";

let api;
before(async () => { api = await start(); });
after(stop);
beforeEach(reset);

test("the health check says which commit is running", async () => {
    const health = await api.get("/api/v1/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");
    // Railway sets RAILWAY_GIT_COMMIT_SHA; tests run without it
    assert.ok("commit" in health.body);
    assert.equal(health.body.commit, process.env.RAILWAY_GIT_COMMIT_SHA || null);
});

test("the health check fails without the database", () => {
    assert.equal(healthAnswer(mongoose.ConnectionStates.connected).code, 200);
    assert.equal(healthAnswer(mongoose.ConnectionStates.disconnected).code, 503);
});

test("a request body that can't be read is the sender's error, not the server's", async () => {
    const post = (headers, body) => {
        const request = api.post("/api/v1/auth/login").set("Content-Type", "application/json");
        for (const [name, value] of Object.entries(headers)) request.set(name, value);
        return request.send(body);
    };
    const broken = await post({}, "{ not json");
    assert.equal(broken.status, 400);
    assert.equal(broken.body.error.code, "BAD_REQUEST");
    // compressed, but not really: a broken or padded gzip stream
    assert.equal((await post({ "Content-Encoding": "gzip" }, Buffer.from("this is not gzip at all"))).status, 400);
    const encoding = await post({ "Content-Encoding": "compress" }, "{}");
    assert.equal(encoding.status, 415);
    assert.match(encoding.body.error.message, /can't be read/);
    assert.equal((await post({}, JSON.stringify({ email: "x".repeat(200 * 1024) }))).status, 413);
});

test("signing up signs you in and never returns the password", async () => {
    const person = await signUp(api, { email: "Wanjiru@Example.com" });
    assert.ok(person.token);
    assert.equal(person.user.email, "wanjiru@example.com");
    assert.equal(person.user.password, undefined);

    const me = await api.get("/api/v1/auth/me").set(person.auth);
    assert.equal(me.status, 200);
    assert.equal(me.body.password, undefined);
});

test("nobody can give themselves a role when signing up", async () => {
    const person = await signUp(api, { role: "admin" });
    assert.equal(person.user.role, "user");

    const stats = await api.get("/api/v1/admin/stats").set(person.auth);
    assert.equal(stats.status, 403);
});

test("signing up rejects weak passwords and duplicate emails", async () => {
    const weak = await api.post("/api/v1/auth/register").send({ fullName: "Amina", email: "a@example.com", password: "short" });
    assert.equal(weak.status, 400);

    await signUp(api, { email: "dup@example.com" });
    const again = await api.post("/api/v1/auth/register").send({ fullName: "Amina", email: "dup@example.com", password: "long-enough-1" });
    assert.equal(again.status, 409);
});

test("login gives the same answer for a wrong password and an unknown email", async () => {
    const person = await signUp(api);

    const ok = await api.post("/api/v1/auth/login").send({ email: person.user.email, password: person.password });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);

    const wrongPassword = await api.post("/api/v1/auth/login").send({ email: person.user.email, password: "not-the-password" });
    const unknownEmail = await api.post("/api/v1/auth/login").send({ email: "nobody@example.com", password: "not-the-password" });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
});

test("protected routes need a valid token", async () => {
    assert.equal((await api.get("/api/v1/auth/me")).status, 401);
    assert.equal((await api.get("/api/v1/auth/me").set("Authorization", "Bearer nonsense")).status, 401);
    assert.equal((await api.get("/api/v1/journal")).status, 401);
});

test("profile updates cannot change the role", async () => {
    const person = await signUp(api);
    const res = await api.patch("/api/v1/auth/me").set(person.auth).send({ fullName: "New Name", role: "admin" });
    assert.equal(res.status, 200);
    assert.equal(res.body.fullName, "New Name");
    assert.equal(res.body.role, "user");
});

test("only sign-in tokens sign you in, not the Google connect state or unsigned tokens", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const { connectUrl, readState } = await import("../src/modules/google/google.service.js");
    const person = await signUp(api);
    const bearer = (token) => ({ Authorization: `Bearer ${token}` });

    // The state travels in the address bar to Google and back
    const state = new URL(connectUrl(person.user._id)).searchParams.get("state");
    assert.equal(readState(state), person.user._id);
    assert.equal((await api.get("/api/v1/auth/me").set(bearer(state))).status, 401);

    const noPurpose = jwt.sign({ sub: person.user._id }, process.env.JWT_SECRET);
    assert.equal((await api.get("/api/v1/auth/me").set(bearer(noPurpose))).status, 401);

    const unsigned = jwt.sign({ sub: person.user._id, purpose: "session" }, null, { algorithm: "none" });
    assert.equal((await api.get("/api/v1/auth/me").set(bearer(unsigned))).status, 401);

    assert.equal((await api.get("/api/v1/auth/me").set(person.auth)).status, 200);
});

test("seeding the admin never promotes an account someone already registered", async () => {
    const { seedAdmin } = await import("../scripts/seed.js");
    const squatter = await signUp(api, { email: "admin@example.com" });

    await seedAdmin({ email: "Admin@Example.com", password: "a-long-admin-password" });
    const me = await api.get("/api/v1/auth/me").set(squatter.auth);
    assert.equal(me.body.role, "user");
    const asAdmin = await api.post("/api/v1/auth/login").send({ email: "admin@example.com", password: "a-long-admin-password" });
    assert.equal(asAdmin.status, 401);

    // A fresh address is created as an admin
    await seedAdmin({ email: "real-admin@example.com", password: "a-long-admin-password" });
    const login = await api.post("/api/v1/auth/login").send({ email: "real-admin@example.com", password: "a-long-admin-password" });
    assert.equal(login.body.user.role, "admin");
});

test("demo accounts are only ever seeded into a database on this machine", async () => {
    const { isLocalHost } = await import("../scripts/seed.js");
    for (const host of ["localhost", "127.0.0.1", "::1"]) assert.equal(isLocalHost(host), true, host);
    for (const host of ["cluster0-shard-00-00.abcde.mongodb.net", "10.0.0.5", "db.example.com", undefined]) assert.equal(isLocalHost(host), false, host);
});

test("changing or resetting the password signs out every other device", async () => {
    const person = await signUp(api);
    const otherDevice = person.auth;
    // Tokens record their time to the second
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const changed = await api.post("/api/v1/auth/change-password").set(person.auth)
        .send({ currentPassword: person.password, newPassword: "a-brand-new-pass" });
    assert.equal(changed.status, 200);
    assert.ok(changed.body.token);
    assert.equal(changed.body.user.passwordChangedAt, undefined);

    const stale = await api.get("/api/v1/auth/me").set(otherDevice);
    assert.equal(stale.status, 401);
    assert.equal((await api.get("/api/v1/auth/me").set({ Authorization: `Bearer ${changed.body.token}` })).status, 200);

    // A reset does the same to the session from the change above
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const { outbox } = await import("../src/utils/mailer.js");
    await api.post("/api/v1/auth/forgot-password").send({ email: person.user.email });
    const token = outbox.findLast((mail) => mail.to === person.user.email).text.match(/token=([\w-]+)/)[1];
    const reset = await api.post("/api/v1/auth/reset-password").send({ token, newPassword: "another-new-pass" });
    assert.equal(reset.status, 200);
    assert.equal((await api.get("/api/v1/auth/me").set({ Authorization: `Bearer ${changed.body.token}` })).status, 401);
    assert.equal((await api.get("/api/v1/auth/me").set({ Authorization: `Bearer ${reset.body.token}` })).status, 200);
});

test("new passwords are limited to what bcrypt actually reads", async () => {
    const register = (password) => api.post("/api/v1/auth/register").send({ fullName: "Amina", email: `amina${Math.random()}@example.com`, password });
    assert.equal((await register("a".repeat(72))).status, 201);
    assert.equal((await register("a".repeat(73))).status, 400);
    // 30 characters, but 90 bytes
    assert.equal((await register("€".repeat(30))).status, 400);
});

test("signing in with an unknown email takes as long as a wrong password", async () => {
    const { user } = await signUp(api);
    const time = async (email) => {
        const started = process.hrtime.bigint();
        const res = await api.post("/api/v1/auth/login").send({ email, password: "wrong-password-123" });
        assert.equal(res.status, 401);
        return Number(process.hrtime.bigint() - started) / 1e6;
    };
    await time("nobody@example.com"); // the first call also waits for the dummy hash
    const wrong = await time(user.email);
    const unknown = await time("nobody-else@example.com");
    assert.ok(unknown > wrong / 3, `unknown email answered in ${unknown}ms, wrong password in ${wrong}ms`);
});

test("a broken reset link and a blank title get plain-language messages", async () => {
    const broken = await api.post("/api/v1/auth/reset-password").send({ token: "cut-off", newPassword: "brand-new-pass-1" });
    assert.equal(broken.status, 400);
    assert.match(broken.body.error.message, /reset link is incomplete/);

    const { auth } = await signUp(api);
    const name = await api.patch("/api/v1/auth/me").set(auth).send({ fullName: " a " });
    assert.equal(name.status, 400);
    assert.equal(name.body.error.message, "Enter your name");
});

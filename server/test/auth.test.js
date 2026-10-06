import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { start, stop, reset, signUp } from "./setup.js";

let api;
before(async () => { api = await start(); });
after(stop);
beforeEach(reset);

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

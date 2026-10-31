import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { start, stop, reset, signUp } from "./setup.js";
import env from "../src/config/env.js";
import { CRISIS_REPLY } from "../src/utils/crisis.js";

let api;
let provider;
// What the provider answers: an error unless a test sets a message
let answer = null;
before(async () => {
    api = await start();
    // A provider that turns every request away
    provider = http.createServer((req, res) => {
        if (answer) return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(answer));
        res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "no" } }));
    });
    await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${provider.address().port}`;
    env.ANTHROPIC_API_KEY = "test-key";
});
after(async () => {
    env.ANTHROPIC_API_KEY = "";
    provider.close();
    await stop();
});
beforeEach(async () => {
    answer = null;
    await reset();
});

test("a crisis message still gets the safety reply when the AI provider fails", async () => {
    const person = await signUp(api);
    const answer = await api.post("/api/v1/ai/messages").set(person.auth).send({ message: "I don’t want to live anymore" });
    assert.equal(answer.status, 201);
    assert.equal(answer.body.reply.message, CRISIS_REPLY);
    assert.equal(answer.body.crisis, true);
    assert.ok(answer.body.contacts.length > 0);
});

test("a crisis message the model declines still gets the safety reply", async () => {
    answer = { id: "msg_1", type: "message", role: "assistant", model: "m", content: [], stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 1 } };
    const person = await signUp(api);
    const crisis = await api.post("/api/v1/ai/messages").set(person.auth).send({ message: "I want to kill myself" });
    assert.equal(crisis.status, 201);
    assert.equal(crisis.body.reply.message, CRISIS_REPLY);
    assert.match(crisis.body.reply.message, /999/);
});

test("any other message reports that the companion could not answer, and saves nothing", async () => {
    const person = await signUp(api);
    const answer = await api.post("/api/v1/ai/messages").set(person.auth).send({ message: "I had a long day" });
    assert.equal(answer.status, 502);
    assert.equal((await api.get("/api/v1/ai/messages").set(person.auth)).body.messages.length, 0);
});

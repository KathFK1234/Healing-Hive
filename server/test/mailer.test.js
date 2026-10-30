import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { parseSender, sendWithBrevo } from "../src/utils/mailer.js";

const message = { from: "Healing Hive <hello@example.com>", to: "person@example.com", subject: "Hello", text: "Body" };

// A stand-in for Brevo that records the request and gives a set answer
async function fakeBrevo(status, answer) {
    const requests = [];
    const server = http.createServer((req, res) => {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            requests.push({ path: req.url, key: req.headers["api-key"], body: JSON.parse(body) });
            res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(answer));
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return { requests, server, config: { apiKey: "test-key", apiUrl: `http://127.0.0.1:${server.address().port}/v3` } };
}

test("the sender is read with or without a name", () => {
    assert.deepEqual(parseSender("Healing Hive <hello@example.com>"), { name: "Healing Hive", email: "hello@example.com" });
    assert.deepEqual(parseSender('"Healing Hive" <hello@example.com>'), { name: "Healing Hive", email: "hello@example.com" });
    assert.deepEqual(parseSender("<hello@example.com>"), { email: "hello@example.com" });
    assert.deepEqual(parseSender(" hello@example.com "), { email: "hello@example.com" });
});

test("an email goes to Brevo as plain text with the key in its header", async (t) => {
    const brevo = await fakeBrevo(201, { messageId: "<1@example.com>" });
    t.after(() => brevo.server.close());
    await sendWithBrevo(message, brevo.config);
    assert.deepEqual(brevo.requests, [{
        path: "/v3/smtp/email",
        key: "test-key",
        body: { sender: { name: "Healing Hive", email: "hello@example.com" }, to: [{ email: "person@example.com" }], subject: "Hello", textContent: "Body" },
    }]);
});

test("a refused email fails with Brevo's code, not its message", async (t) => {
    const brevo = await fakeBrevo(400, { code: "invalid_parameter", message: "person@example.com is not valid" });
    t.after(() => brevo.server.close());
    await assert.rejects(sendWithBrevo(message, brevo.config), (err) => {
        assert.equal(err.message, "Brevo answered 400 (invalid_parameter)");
        return true;
    });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import "./setup.js";

const { errorHandler } = await import("../src/middleware/error.js");

function handle(err) {
    const res = {
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; },
    };
    errorHandler(err, {}, res, () => {});
    return res;
}

test("a duplicate names what already exists", () => {
    const res = handle({ code: 11000, keyPattern: { email: 1 }, keyValue: { email: "a@example.com" } });
    assert.equal(res.code, 409);
    assert.equal(res.body.error.message, "An account with that email already exists");

    assert.equal(handle({ code: 11000, keyPattern: { session: 1 } }).body.error.message, "This session has already been rated");
    assert.doesNotMatch(handle({ code: 11000, keyPattern: { other: 1 } }).body.error.message, /^That already exists$/);
});

test("an invalid value names its field", () => {
    const res = handle({ name: "CastError", path: "page", kind: "Number" });
    assert.equal(res.code, 400);
    assert.equal(res.body.error.message, "The page given is not valid");
    assert.deepEqual(res.body.error.details, [{ field: "page", message: "Not a valid value" }]);
});

test("an unexpected error gives a reference but no internals", () => {
    const res = handle(new Error("connection string mongodb://secret@host"));
    assert.equal(res.code, 500);
    assert.match(res.body.error.message, /reference for this error is [0-9a-f]{8}$/);
    assert.doesNotMatch(JSON.stringify(res.body), /secret|mongodb/);
});

test("an index that can't be built is named in the log, without the duplicate value", async () => {
    const { reportIndexFailures } = await import("../src/config/db.js");
    const duplicate = Object.assign(new Error('E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "person@example.org" }'), { code: 11000, codeName: "DuplicateKey" });
    const lines = [];
    const failed = await reportIndexFailures({ User: { init: () => Promise.reject(duplicate) }, Mood: { init: () => Promise.resolve() } }, (line) => lines.push(line));
    assert.deepEqual(failed, ["User"]);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^Database indexes for User could not be built \(DuplicateKey\)/);
    assert.doesNotMatch(lines[0], /person@example\.org/);
    assert.match(lines[0], /duplicate data$/);

    // Only a duplicate key points at the data
    const dropped = Object.assign(new Error("connection closed"), { name: "MongoNetworkError" });
    await reportIndexFailures({ Session: { init: () => Promise.reject(dropped) } }, (line) => lines.push(line));
    assert.match(lines[1], /^Database indexes for Session could not be built \(MongoNetworkError\)/);
    assert.doesNotMatch(lines[1], /duplicate/);
});

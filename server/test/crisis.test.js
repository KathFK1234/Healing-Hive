import { test } from "node:test";
import assert from "node:assert/strict";
import { CRISIS_CONTACTS, CRISIS_REPLY, looksLikeCrisis } from "../src/utils/crisis.js";
import { CRISIS_CONTACTS as CLIENT_CONTACTS } from "../../client/src/lib/crisis.js";

// The web app keeps its own copy so the help page works when the API is
// down. Both reach people in crisis, so they must never disagree.
test("the server and the web app list the same crisis contacts", () => {
    assert.deepEqual(CRISIS_CONTACTS, CLIENT_CONTACTS);
});

test("every number in the crisis reply is one of the listed contacts", () => {
    const listed = new Set(CRISIS_CONTACTS.flatMap((contact) => [contact.phone, ...(contact.note.match(/\b112\b/g) || [])]));
    const mentioned = CRISIS_REPLY.match(/\+?\d[\d ]{1,}\d/g);
    assert.ok(mentioned.length >= 3);
    for (const number of mentioned) assert.ok(listed.has(number), `${number} is not in CRISIS_CONTACTS`);
});

test("crisis messages are noticed however they are typed", () => {
    for (const text of [
        "I don\u2019t want to live anymore", "I dont want to be here", "I wanna die", "I wish I was dead", "I want to end it all",
        "I can\u2019t go on", "I cant go on", "there is no point in living", "nothing to live for", "I keep hurting myself",
        "nataka kujiua", "nitajiua", "sitaki kuishi", "ni bora nife",
    ]) assert.ok(looksLikeCrisis(text), text);
});

test("everyday messages are not treated as a crisis", () => {
    for (const text of ["I feel so tired today", "my phone died", "I want to go on holiday", "this is killing me, so much homework"]) {
        assert.equal(looksLikeCrisis(text), false, text);
    }
});

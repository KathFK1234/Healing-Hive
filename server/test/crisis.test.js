import { test } from "node:test";
import assert from "node:assert/strict";
import { CRISIS_CONTACTS, CRISIS_REPLY } from "../src/utils/crisis.js";
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

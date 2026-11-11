import { test } from "node:test";
import assert from "node:assert/strict";
import { CRISIS_CONTACTS, CRISIS_REPLY, DANGER_REPLY, looksLikeCrisis, safetyReplyFor } from "../src/utils/crisis.js";
import { CRISIS_CONTACTS as CLIENT_CONTACTS } from "../../client/src/lib/crisis.js";

// The web app keeps its own copy so the help page works when the API is
// down. Both reach people in crisis, so they must never disagree.
test("the server and the web app list the same crisis contacts", () => {
    assert.deepEqual(CRISIS_CONTACTS, CLIENT_CONTACTS);
});

test("every number in the safety replies is one of the listed contacts", () => {
    const listed = new Set(CRISIS_CONTACTS.flatMap((contact) => [contact.phone, ...(contact.note.match(/\b112\b/g) || [])]));
    for (const reply of [CRISIS_REPLY, DANGER_REPLY]) {
        const mentioned = reply.match(/\+?\d[\d ]{1,}\d/g);
        assert.ok(mentioned.length >= 3);
        for (const number of mentioned) assert.ok(listed.has(number), `${number} is not in CRISIS_CONTACTS`);
    }
});

test("someone hurt or threatened by another person gets the violence lines", () => {
    for (const text of [
        "he beats me every night", "my husband hits me", "my uncle touches me", "I was raped", "I'm scared he will kill me",
        "she threatened to kill me", "I don\u2019t feel safe at home", "ananipiga kila siku", "alinibaka", "ananitishia",
    ]) assert.equal(safetyReplyFor(text), DANGER_REPLY, text);
    assert.equal(safetyReplyFor("he beats me and I want to die"), CRISIS_REPLY);
    for (const text of ["he hit me up on WhatsApp", "she beat me at FIFA", "your words touched me", "my mum is going to kill me when she sees my grades", "alinipigia simu"]) {
        assert.equal(safetyReplyFor(text), null, text);
    }
});

test("crisis messages are noticed however they are typed", () => {
    for (const text of [
        "I don\u2019t want to live anymore", "I dont want to be here", "I wanna die", "I wish I was dead", "I want to end it all",
        "I can\u2019t go on", "I cant go on", "there is no point in living", "nothing to live for", "I keep hurting myself",
        "nataka kujiua", "nitajiua", "sitaki kuishi", "ni bora nife",
        "I want to unalive myself", "gonna kms", "life is not worth living", "I can\u2019t take it anymore", "I can't do this any more",
        "I hope I never wake up", "I don't want to wake up", "I want to disappear forever",
        "najiua", "ngoja nijiue", "anataka kujitoa uhai", "nataka kujimaliza", "nimechoka na maisha", "nimechoka kuishi", "sina sababu ya kuishi", "nijinyonge",
        "I want to hang myself", "I'm going to jump off a bridge", "I want to jump in front of a car", "I took too many pills", "I'm going to drink poison",
        "thinking of drinking jik", "I have a rope", "I'm thinking of ending things", "I won't be here tomorrow", "this is my goodbye",
        "I don’t want to exist anymore", "I want to stop existing", "life isn't worth living", "I'm tired of living", "I'm done with life",
        "I feel like dying", "thinking of taking my own life", "nobody would miss me if I was gone", "I'm a burden to everyone",
        "natamani kufa", "heri nife", "ningependa kufa", "nataka kunywa sumu", "nitakunywa sumu", "maisha haina maana", "najihisi kama kufa",
    ]) assert.ok(looksLikeCrisis(text), text);
});

test("everyday messages are not treated as a crisis", () => {
    for (const text of ["I feel so tired today", "my phone died", "I want to go on holiday", "this is killing me, so much homework", "I walked 5 kms today", "I can't take it with me", "nimechoka sana leo", "I never wake up on time",
        "I'm ending things with my boyfriend", "I jumped off the bus at my stage", "I take all my pills with breakfast", "I'm tired of this rain", "I'm done with my exams", "nataka kunywa chai"]) {
        assert.equal(looksLikeCrisis(text), false, text);
    }
});

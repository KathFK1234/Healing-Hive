// Crisis contacts for Kenya. The web app keeps its own copy in
// client/src/lib/crisis.js so the help page still works when the API is down.
// Keep the two in step, and re-check the numbers before every release.
export const CRISIS_CONTACTS = [
    { name: "Emergency services", phone: "999", note: "Police, ambulance and fire. 112 also works from mobile phones" },
    { name: "Kenya Red Cross", phone: "1199", note: "Toll-free counselling and emergency line" },
    { name: "Befrienders Kenya", phone: "+254 722 178 177", note: "Confidential emotional support for people in distress" },
    { name: "GBV helpline", phone: "1195", note: "Toll-free support for gender-based violence, any hour" },
    { name: "Childline Kenya", phone: "116", note: "Toll-free helpline for children and young people" },
];

// A deliberately broad first screen. It will have false positives; the cost of
// showing help contacts to someone who did not need them is small, and the cost
// of missing someone who did is not.
const CRISIS_PATTERNS = [
    /\bsuicid/i,
    /\bkill(ing)?\s+my\s?self\b/i,
    /\bend(ing)?\s+(my|this)\s+life\b/i,
    /\btake\s+my\s+(own\s+)?life\b/i,
    /\b(want|wish|going|ready)\s+to\s+die\b/i,
    /\bbetter\s+off\s+(dead|without\s+me)\b/i,
    /\bno\s+reason\s+to\s+(live|go\s+on)\b/i,
    /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|be\s+here)\b/i,
    /\b(hurt|harm|cut)(ting)?\s+my\s?self\b/i,
    /\bself[-\s]?harm/i,
    /\boverdos/i,
    /\bkujiua\b/i,
    /\bnijiue\b/i,
    /\bnataka\s+kufa\b/i,
];

export function looksLikeCrisis(text) {
    return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}

export const CRISIS_REPLY =
    "I'm really glad you told me, and I'm sorry you're carrying this much pain. " +
    "You deserve support from a person right now, and I'm not able to give you that on my own. " +
    "If you might act on these thoughts or you are in danger, please call 999 or 112 now. " +
    "You can also reach Befrienders Kenya on +254 722 178 177 or the Kenya Red Cross toll-free on 1199. " +
    "If you can, tell someone near you that you trust how you are feeling. I'm still here if you want to keep talking.";

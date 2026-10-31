// Crisis contacts for Kenya, ordered so the lines that answer at any hour come
// first. Last checked against each organisation's published details in
// October 2026. The web app keeps its own copy in client/src/lib/crisis.js so
// the help page still works when the API is down: keep the two in step (test/crisis.test.js checks), and
// re-check the numbers before every release.
export const CRISIS_CONTACTS = [
    { name: "Emergency services", phone: "999", hours: "Any time", note: "Police, ambulance and fire. 112 also works from mobile phones." },
    { name: "Kenya Red Cross", phone: "1199", hours: "Any time, free", note: "Free counselling by phone, day or night." },
    { name: "GBV helpline", phone: "1195", hours: "Any time, free", note: "Support for anyone facing sexual or gender-based violence." },
    { name: "Child helpline", phone: "116", hours: "Any time, free", note: "For children and young people. Also on WhatsApp: 0722 116 116." },
    { name: "Befrienders Kenya", phone: "+254 722 178 177", hours: "Weekdays, 9am to 5pm", note: "Confidential emotional support by call, SMS or WhatsApp." },
];

// A deliberately broad first screen. It will have false positives; the cost of
// showing help contacts to someone who did not need them is small, and the cost
// of missing someone who did is not.
const CRISIS_PATTERNS = [
    /\bsuicid/i,
    /\bkill(ing)?\s+my\s?self\b/i,
    /\bend(ing)?\s+(my|this)\s+life\b/i,
    /\bend(ing)?\s+it\s+all\b/i,
    /\btake\s+my\s+(own\s+)?life\b/i,
    /\b(want|wish|going|ready)\s+to\s+die\b/i,
    /\b(wanna|gonna)\s+die\b/i,
    /\bwish\s+i\s+(was|were)\s+dead\b/i,
    /\bbetter\s+off\s+(dead|without\s+me)\b/i,
    /\bno\s+reason\s+to\s+(live|go\s+on)\b/i,
    /\bno\s+point\s+(in|to)\s+(living|live|going\s+on|go\s+on)\b/i,
    /\bnothing\s+to\s+live\s+for\b/i,
    /\bcan(no|')?t\s+go\s+on\b/i,
    /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|be\s+here)\b/i,
    /\b(hurt|harm|cut)(ing|ting)?\s+my\s?self\b/i,
    /\bself[-\s]?harm/i,
    /\boverdos/i,
    /\bunalive\b/i,
    /\b(gonna|wanna|going\s+to|want\s+to|should|might|just)\s+kms\b/i,
    /\bnot\s+worth\s+living\b/i,
    /\bcan(no|')?t\s+(take|do)\s+(it|this)\s+any\s?more\b/i,
    /\b(hope|wish|want|pray)\b.{0,20}\bnever\s+wake\s+up\b/i,
    /\b(don'?t|do\s+not)\s+want\s+to\s+wake\s+up\b/i,
    /\bdisappear\s+forever\b/i,
    /\b(ku|ni|na|nita|ta)jiua\b/i,
    /\bnijiue\b/i,
    /\bkujitoa\s+uhai\b/i,
    /\b(ku|ni|nita)jimaliza\b/i,
    /\bnijimalize\b/i,
    /\bnimechoka\s+(na\s+maisha|kuishi)\b/i,
    /\bsina\s+sababu\s+ya\s+kuishi\b/i,
    /\bni?jinyonge\b/i,
    /\bkujinyonga\b/i,
    /\bkujidhuru\b/i,
    /\bnataka\s+kufa\b/i,
    /\bbora\s+nife\b/i,
    /\bsitaki\s+kuishi\b/i,
];

// Phones type a curly apostrophe, so "don\u2019t" has to read as "don't"
export function looksLikeCrisis(text) {
    const plain = text.replace(/[\u2018\u2019\u02bc`]/g, "'");
    return CRISIS_PATTERNS.some((pattern) => pattern.test(plain));
}

export const CRISIS_REPLY =
    "I'm really glad you told me, and I'm sorry you're carrying this much pain. " +
    "You deserve support from a person right now, and I'm not able to give you that on my own. " +
    "If you might act on these thoughts or you are in danger, please call 999 or 112 now. " +
    "You can talk to a counsellor for free at any hour by calling the Kenya Red Cross on 1199. " +
    "Befrienders Kenya is also there on weekdays from 9am to 5pm on +254 722 178 177. " +
    "If you can, tell someone near you that you trust how you are feeling. I'm still here if you want to keep talking.";

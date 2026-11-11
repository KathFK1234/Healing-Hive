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
    /\b(take|taking|took)\s+my\s+(own\s+)?life\b/i,
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
    // Ways and means: these are among the most urgent things someone can say
    /\bhang(ing)?\s+my\s?self\b/i,
    /\bjump(ing)?\s+(off|from|in\s+front\s+of)\s+(a|an|the|this|that)?\s*(bridge|building|roof|balcony|cliff|train|car|bus|lorry|truck|matatu)\b/i,
    /\b(took|take|taking|swallow(ed|ing)?)\s+too\s+many\s+(pills|tablets|meds)\b/i,
    /\b(took|swallow(ed|ing)?)\s+all\s+(my|the|of\s+my)\s+(pills|tablets|meds|medicine)\b/i,
    /\b(drink|drinking|drank|swallow(ed|ing)?|take|taking|took)\s+(poison|jik|bleach|rat\s+poison|dawa\s+ya\s+panya)\b/i,
    /\b(have|got|bought)\s+(a|the)\s+rope\b/i,
    // Wishing not to be alive, and saying goodbye
    /\bend(ing)?\s+(things|everything)\b(?!\s+with\b)/i,
    /\b(won'?t|will\s+not)\s+be\s+(here|around|alive)\s+(tomorrow|much\s+longer|any\s?more)\b/i,
    /\bthis\s+is\s+(my\s+)?goodbye\b/i,
    /\b(don'?t|do\s+not)\s+want\s+to\s+exist\b/i,
    /\bstop\s+existing\b/i,
    /\b(is\s*n'?t|is\s+not)\s+worth\s+living\b/i,
    /\btired\s+of\s+(living|being\s+alive|life)\b/i,
    /\bdone\s+with\s+(life|living)\b/i,
    /\bfeel\s+like\s+dying\b/i,
    /\b(nobody|no\s+one)\s+would\s+(miss|notice|care)\b.{0,25}\b(gone|dead|die|died)\b/i,
    /\ba\s+burden\s+to\s+(everyone|everybody|my\s+family|them|all)\b/i,
    /\b(natamani|ningependa|heri|afadhali)\s+(ni)?(kufa|nife)\b/i,
    /\b(ku|ni|nita|nime|ta)?kunywa\s+sumu\b/i,
    /\bmaisha\s+(haina|hayana)\s+maana\b/i,
    /\b(najihisi|nahisi|naskia|najiskia)\s+(kama\s+)?kufa\b/i,
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

// Someone being hurt, abused or threatened by another person. The same broad
// screen, but these people need the violence lines more than a counsellor.
const DANGER_PATTERNS = [
    /\b(he|she|they|my\s+\w+)\s+(beats?|hits?|chokes?|strangles?|kicks?|slaps?)\s+me\b(?!\s+(up|at|to|in)\b)/i,
    /\b(he|she|they|my\s+\w+)\s+(raped|rapes|molested|molests|forced\s+himself|forced\s+herself)\b/i,
    /\bi\s+(was|got|have\s+been|am\s+being|'?ve\s+been)\s+(raped|molested|sexually\s+(assaulted|abused)|abused|beaten)\b/i,
    /\b(uncle|father|dad|stepfather|stepdad|teacher|pastor|boss|brother|cousin|husband|boyfriend|he)\s+(touches|touched|keeps\s+touching)\s+me\b/i,
    /\b(scared|afraid|terrified)\s+(he|she|they)('ll|\s+will|\s+is\s+going\s+to|\s+are\s+going\s+to|\s+might)\s+(kill|hurt|beat)\s+me\b/i,
    /\bthreaten(ed|s|ing)?\s+to\s+(kill|hurt|beat)\s+me\b/i,
    /\b(not|don'?t\s+feel)\s+safe\s+at\s+home\b/i,
    /\b(a|ali|ame|hu)(na)?nipiga\b/i,
    /\b(a|ali|ame)(na)?nibaka\b/i,
    /\b(a|ali|ame)(na)?nitishia\b/i,
];

// Phones type a curly apostrophe, so "don\u2019t" has to read as "don't"
const plainText = (text) => text.replace(/[\u2018\u2019\u02bc`]/g, "'");

export function looksLikeCrisis(text) {
    return safetyReplyFor(text) !== null;
}

// The reply that stands ready for a message, or null when it needs none.
// Thoughts of dying come first when a message has both.
export function safetyReplyFor(text) {
    const plain = plainText(text);
    if (CRISIS_PATTERNS.some((pattern) => pattern.test(plain))) return CRISIS_REPLY;
    if (DANGER_PATTERNS.some((pattern) => pattern.test(plain))) return DANGER_REPLY;
    return null;
}

export const CRISIS_REPLY =
    "I'm really glad you told me, and I'm sorry you're carrying this much pain. " +
    "You deserve support from a person right now, and I'm not able to give you that on my own. " +
    "If you might act on these thoughts or you are in danger, please call 999 or 112 now. " +
    "You can talk to a counsellor for free at any hour by calling the Kenya Red Cross on 1199. " +
    "Befrienders Kenya is also there on weekdays from 9am to 5pm on +254 722 178 177. " +
    "If you can, tell someone near you that you trust how you are feeling. I'm still here if you want to keep talking.";

export const DANGER_REPLY =
    "I'm really sorry this is happening to you. It is not your fault, and you deserve to be safe. " +
    "If you are in danger right now, please call 999 or 112. " +
    "The GBV helpline on 1195 is free and answers at any hour, and if you are under 18 the Child helpline on 116 is there for you too. " +
    "The Kenya Red Cross on 1199 offers free counselling day or night. " +
    "If you can, get somewhere you feel safer or tell someone you trust. I'm still here if you want to keep talking.";

// Fills a database with starting content.
//
//   npm run seed            nuggets, plus the admin account from ADMIN_EMAIL / ADMIN_PASSWORD
//   npm run seed -- --demo  also adds sample accounts of every kind with some history
//                           (never on production: the people are made up, share a known
//                           password, and would show in the public directory)
//
// Safe to run more than once: existing records are left alone.
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import env from "../src/config/env.js";
import { connectDb, disconnectDb } from "../src/config/db.js";
import User from "../src/modules/users/user.model.js";
import Nugget from "../src/modules/nuggets/nugget.model.js";
import Professional from "../src/modules/professionals/professional.model.js";
import Event from "../src/modules/events/event.model.js";
import Session from "../src/modules/sessions/session.model.js";
import Review from "../src/modules/reviews/review.model.js";
import Mood from "../src/modules/moods/mood.model.js";
import Journal from "../src/modules/journal/journal.model.js";
import Reminder from "../src/modules/reminders/reminder.model.js";

const nuggets = [
    {
        title: "Myth: Seeking therapy means you're weak",
        type: "myth",
        topic: "Stigma & Myths",
        readMinutes: 2,
        content: "Reality: Seeking therapy shows strength and self-awareness. It takes courage to ask for help and work on yourself. Just like going to a doctor for physical health, therapy is healthcare for your mind.",
    },
    {
        title: "Quick Breathing Exercise",
        type: "tip",
        topic: "Anxiety Management",
        readMinutes: 1,
        content: "Try the 4-7-8 technique: breathe in for 4 counts, hold for 7, exhale for 8. Slow exhales signal your body to settle, which can ease anxiety in a stressful moment.",
    },
    {
        title: "You belong here",
        type: "affirmation",
        topic: "Daily Affirmations",
        readMinutes: 1,
        content: "Your feelings are valid, your struggles are real, and your healing matters. You don't have to carry everything alone. There is strength in reaching out and connecting with others.",
    },
    {
        title: "Understanding Depression vs Sadness",
        type: "educational",
        topic: "Mental Health Basics",
        readMinutes: 3,
        content: "Sadness is a normal emotion that comes and goes. Depression is a persistent condition that affects daily life: changes in sleep, appetite, energy and concentration that last for weeks or months. If that sounds familiar, it is worth talking to a professional.",
    },
    {
        title: "Myth: Mental health issues don't affect Africans",
        type: "myth",
        topic: "Cultural Context",
        readMinutes: 2,
        content: "Reality: Mental health challenges affect people of every background, including Africans. Stigma can make them seem less common than they are. Seeking help is a sign of wisdom, not weakness.",
    },
    {
        title: "Grounding Technique: 5-4-3-2-1",
        type: "tip",
        topic: "Coping Strategies",
        readMinutes: 2,
        content: "When you feel overwhelmed, name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell and 1 thing you can taste. This brings your attention back to the present moment.",
    },
    {
        title: "You're allowed to rest",
        type: "affirmation",
        topic: "Daily Affirmations",
        readMinutes: 1,
        content: "Rest is not something you earn by being productive. Your body and mind need it to keep going. Taking a break today is part of looking after yourself.",
    },
    {
        title: "Name it to tame it",
        type: "tip",
        topic: "Coping Strategies",
        readMinutes: 1,
        content: "Putting a feeling into words, out loud or on paper, can make it less intense. Instead of \"I feel bad\", try to be specific: \"I feel left out\" or \"I feel worried about money\". A clear name gives you something to work with.",
    },
    {
        title: "Myth: Talking about suicide puts the idea in someone's head",
        type: "myth",
        topic: "Stigma & Myths",
        readMinutes: 2,
        content: "Reality: Asking someone directly and kindly whether they are thinking about suicide does not plant the idea. It often brings relief, because it shows that someone noticed and is willing to listen. If you are worried about a friend, ask.",
    },
    {
        title: "The worry window",
        type: "tip",
        topic: "Anxiety Management",
        readMinutes: 2,
        content: "Pick fifteen minutes a day as your worry time. When a worry shows up outside it, note it down and tell yourself you will come back to it then. Many worries shrink or disappear by the time the window arrives.",
    },
    {
        title: "What a panic attack is",
        type: "educational",
        topic: "Mental Health Basics",
        readMinutes: 3,
        content: "A panic attack is a sudden rush of intense fear with strong physical signs: a racing heart, short breath, shaking, dizziness. It feels dangerous but it passes, usually within ten to twenty minutes. Slow breathing and reminding yourself that it will pass both help.",
    },
    {
        title: "You can be strong and still need help",
        type: "affirmation",
        topic: "Cultural Context",
        readMinutes: 1,
        content: "Many of us grew up hearing that we should just be strong and keep going. Strength and needing support are not opposites. The people who hold families and communities together need holding too.",
    },
];

// Monday to Friday, 9:00 to 17:00
const weekdays = [1, 2, 3, 4, 5].map((day) => ({ day, start: 9 * 60, end: 17 * 60 }));

// Sample accounts for local development, one of each kind, all with the same
// password so every part of the app can be explored. Never created in production.
export const DEMO_PASSWORD = "healing-hive-demo";
export const DEMO_ACCOUNTS = {
    client: "client@healinghive.local",
    therapist: "therapist@healinghive.local",
    institution: "institution@healinghive.local",
};

const demoProfessionals = [
    {
        fullName: "Dr. Amani Njeri (sample)", email: DEMO_ACCOUNTS.therapist, type: "therapist",
        title: "Counselling Psychologist", location: "Nairobi", yearsExperience: 9, amount: 3000,
        specialties: ["Anxiety", "Depression", "Stress Management"], languages: ["English", "Swahili", "Kikuyu"],
        bio: "I help young adults who feel anxious, low or stuck. My sessions are calm and practical, and we go at your pace.",
    },
    {
        fullName: "Dr. Grace Wanjiku (sample)", email: "grace.sample@healinghive.local", type: "therapist",
        title: "Clinical Psychologist", location: "Nairobi", yearsExperience: 12, amount: 3500,
        specialties: ["Anxiety", "Depression", "Trauma"], languages: ["English", "Swahili", "Kikuyu"],
        bio: "Works with young adults on anxiety and depression, with a culturally sensitive approach.",
    },
    {
        fullName: "Dr. James Kimani (sample)", email: "james.sample@healinghive.local", type: "therapist",
        title: "Family Therapist", location: "Mombasa", yearsExperience: 8, amount: 4000,
        specialties: ["Relationships", "Family Therapy"], languages: ["English", "Swahili"],
        bio: "Specialises in relationship and family therapy.",
    },
    {
        fullName: "Dr. Ruth Akinyi (sample)", email: "ruth.sample@healinghive.local", type: "therapist",
        title: "Trauma Therapist", location: "Nakuru", yearsExperience: 14, amount: 3800,
        specialties: ["Trauma", "PTSD", "Grief"], languages: ["English", "Swahili", "Luo"],
        bio: "Supports people recovering from trauma and loss, using approaches with strong evidence behind them.",
    },
    {
        fullName: "Peter Ochieng (sample)", email: "peter.sample@healinghive.local", type: "peer",
        title: "Peer Counsellor", location: "Kisumu", yearsExperience: 2, amount: 500,
        specialties: ["Stress Management", "Life Transitions"], languages: ["English", "Swahili", "Luo"],
        bio: "A trained peer counsellor who has been through campus burnout and came out the other side.",
    },
    {
        fullName: "Faith Chebet (sample)", email: "faith.sample@healinghive.local", type: "peer",
        title: "Peer Counsellor", location: "Eldoret", yearsExperience: 3, amount: 0,
        specialties: ["Anxiety", "Career Counselling"], languages: ["English", "Swahili", "Kalenjin"],
        bio: "I offer free peer sessions for students and first-jobbers working through pressure and uncertainty.",
    },
];

const demoEvents = [
    { title: "Managing exam stress (sample)", days: 10, speaker: "Dr. Grace Wanjiku (sample)", capacity: 50, description: "A guided group session on practical ways to stay steady during exam season." },
    { title: "Sleep and your mood (sample)", days: 17, speaker: "Dr. Amani Njeri (sample)", capacity: 80, description: "Why sleep and mood are so closely tied, and small changes that make nights easier." },
    { title: "Supporting a friend who is struggling (sample)", days: 24, speaker: "Peter Ochieng (sample)", price: 200, description: "What to say, what not to say, and how to look after yourself while you help someone else." },
];

const DAY = 24 * 60 * 60 * 1000;

// A time on a day `offset` days from now, at `hour` o'clock East Africa Time
function at(offset, hour) {
    const day = new Date(Date.now() + offset * DAY + 3 * 60 * 60 * 1000);
    return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour - 3));
}

async function seedNuggets() {
    let added = 0;
    for (const nugget of nuggets) {
        const exists = await Nugget.exists({ title: nugget.title });
        if (exists) continue;
        await Nugget.create({ ...nugget, status: "published", publishedAt: new Date() });
        added++;
    }
    console.log(`Nuggets: ${added} added, ${nuggets.length - added} already there`);
}

async function seedAdmin() {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
        console.log("Admin: skipped (set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create one)");
        return;
    }
    if (env.ADMIN_PASSWORD.length < 12) {
        console.log("Admin: skipped (ADMIN_PASSWORD must be at least 12 characters)");
        return;
    }
    const email = env.ADMIN_EMAIL.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
        if (existing.role !== "admin") await User.updateOne({ _id: existing._id }, { role: "admin" });
        console.log(`Admin: ${email} already exists, role is admin`);
        return;
    }
    await User.create({
        fullName: "Healing Hive Admin",
        email,
        password: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
        role: "admin",
    });
    console.log(`Admin: created ${email}`);
}

async function seedDemo() {
    if (env.isProduction) {
        console.log("Demo data: refused, NODE_ENV is production");
        return;
    }
    if (await User.exists({ email: DEMO_ACCOUNTS.client })) {
        console.log("Demo data: already in place");
        return;
    }
    const password = await bcrypt.hash(DEMO_PASSWORD, 12);

    // Professionals
    const professionals = {};
    for (const { fullName, email, type, amount, ...profile } of demoProfessionals) {
        const user = await User.findOne({ email })
            || await User.create({ fullName, email, password, role: type, accountType: "professional", phone: "0700 000 000" });
        professionals[email] = await Professional.findOne({ user: user._id })
            || await Professional.create({ user: user._id, type, status: "approved", rate: { amount }, availability: weekdays, ...profile });
    }
    const amani = professionals[DEMO_ACCOUNTS.therapist];
    const grace = professionals["grace.sample@healinghive.local"];

    // An institution, with the sample therapist as an accepted member
    const contact = await User.create({
        fullName: "Tumaini Wellness (sample)", email: DEMO_ACCOUNTS.institution, password,
        role: "institution", accountType: "professional", phone: "0700 000 001",
    });
    const institution = await Professional.create({
        user: contact._id, type: "institution", status: "approved", organisationName: "Tumaini Wellness Centre (sample)",
        location: "Nairobi", bio: "A sample counselling centre used to show the institution dashboard.",
    });
    await Professional.updateOne({ _id: amani._id }, { institution: institution._id, institutionStatus: "active" });
    await Professional.updateOne({ _id: grace._id }, { institution: institution._id, institutionStatus: "invited" });

    // A person looking for support, with a few weeks of history
    const client = await User.create({ fullName: "Wanjiru Kamau (sample)", email: DEMO_ACCOUNTS.client, password });

    const session = (professional, scheduledAt, status, extra = {}) => Session.create({
        client: client._id, professional: professional._id, scheduledAt, status,
        durationMinutes: professional.sessionMinutes, mode: "video",
        price: { amount: professional.rate.amount },
        meetingUrl: status === "confirmed" ? `https://meet.jit.si/HealingHive-${crypto.randomUUID().replaceAll("-", "")}` : undefined,
        ...extra,
    });
    const first = await session(amani, at(-21, 10), "completed", { clientNote: "First time trying therapy." });
    const second = await session(amani, at(-7, 10), "completed");
    const third = await session(grace, at(-14, 14), "completed");
    await session(amani, at(2, 10), "confirmed", { clientNote: "I'd like to talk about work stress." });
    await session(grace, at(5, 14), "pending");

    await Review.create([
        { session: first._id, client: client._id, professional: amani._id, rating: 5, comment: "I felt listened to from the first minute." },
        { session: second._id, client: client._id, professional: amani._id, rating: 4, comment: "Practical ideas I could use the same week." },
        { session: third._id, client: client._id, professional: grace._id, rating: 5 },
    ]);
    await Professional.updateOne({ _id: amani._id }, { ratingAverage: 4.5, ratingCount: 2 });
    await Professional.updateOne({ _id: grace._id }, { ratingAverage: 5, ratingCount: 1 });

    const scores = [3, 2, 3, 4, 3, 4, 4, 2, 3, 4, 5, 4, 3, 4];
    const notes = { 1: "Could not sleep, mind racing", 7: "Argument at home", 10: "Good session with Dr. Amani", 13: "Walked after work" };
    await Mood.insertMany(scores.map((score, index) => {
        const createdAt = new Date(Date.now() - (scores.length - index) * DAY);
        return { user: client._id, score, note: notes[index], tags: index % 3 === 0 ? ["Sleep"] : index % 3 === 1 ? ["Work"] : [], createdAt, updatedAt: createdAt };
    }));

    const entries = [
        { days: 9, title: "A heavy week", mood: 2, content: "Everything felt like too much this week. I wrote a list of what is actually due, and it was shorter than the noise in my head." },
        { days: 4, title: "Small win", mood: 4, content: "I said no to something I did not have room for. It felt strange and then it felt good." },
        { days: 1, title: "", mood: 3, content: "Tried the breathing exercise before the meeting. Not magic, but I was steadier." },
    ];
    await Journal.insertMany(entries.map(({ days, ...entry }) => {
        const createdAt = new Date(Date.now() - days * DAY);
        return { user: client._id, ...entry, createdAt, updatedAt: createdAt };
    }));

    await Reminder.create([
        { user: client._id, message: "Drink some water", time: 9 * 60, days: [0, 1, 2, 3, 4, 5, 6] },
        { user: client._id, message: "Wind down for bed", time: 21 * 60 + 30, days: [0, 1, 2, 3, 4] },
    ]);

    const saved = await Nugget.find({ status: "published" }).limit(2).select("_id");
    await User.updateOne({ _id: client._id }, { savedNuggets: saved.map((nugget) => nugget._id) });

    for (const { days, ...event } of demoEvents) {
        if (await Event.exists({ title: event.title })) continue;
        await Event.create({ ...event, eventDate: at(days, 18), participants: event.capacity === 50 ? [client._id] : [] });
    }

    console.log("Demo data: sample accounts, sessions, reviews and events are in place");
}

export async function seed({ demo = false } = {}) {
    await connectDb();
    await seedNuggets();
    await seedAdmin();
    if (demo) await seedDemo();
    await disconnectDb();
}

// Run directly (npm run seed), as opposed to imported by the dev database script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await seed({ demo: process.argv.includes("--demo") });
}

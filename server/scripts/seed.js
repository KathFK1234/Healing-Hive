// Fills a database with starting content.
//
//   npm run seed            nuggets, plus the admin account from ADMIN_EMAIL / ADMIN_PASSWORD
//   npm run seed -- --demo  also adds sample professionals and an event (never on production:
//                           the people are made up and would show in the public directory)
//
// Safe to run more than once: existing records are left alone.
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import env from "../src/config/env.js";
import { connectDb, disconnectDb } from "../src/config/db.js";
import User from "../src/modules/users/user.model.js";
import Nugget from "../src/modules/nuggets/nugget.model.js";
import Professional from "../src/modules/professionals/professional.model.js";
import Event from "../src/modules/events/event.model.js";

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
];

// Monday to Friday, 9:00 to 17:00
const weekdays = [1, 2, 3, 4, 5].map((day) => ({ day, start: 9 * 60, end: 17 * 60 }));

const demoProfessionals = [
    {
        fullName: "Dr. Grace Wanjiku (sample)", email: "grace.sample@healinghive.test", type: "therapist",
        title: "Clinical Psychologist", location: "Nairobi", yearsExperience: 12, amount: 3500,
        specialties: ["Anxiety", "Depression", "Trauma"], languages: ["English", "Swahili", "Kikuyu"],
        bio: "Works with young adults on anxiety and depression, with a culturally sensitive approach.",
    },
    {
        fullName: "Dr. James Kimani (sample)", email: "james.sample@healinghive.test", type: "therapist",
        title: "Family Therapist", location: "Mombasa", yearsExperience: 8, amount: 4000,
        specialties: ["Relationships", "Family Therapy"], languages: ["English", "Swahili"],
        bio: "Specialises in relationship and family therapy.",
    },
    {
        fullName: "Peter Ochieng (sample)", email: "peter.sample@healinghive.test", type: "peer",
        title: "Peer Counsellor", location: "Kisumu", yearsExperience: 2, amount: 500,
        specialties: ["Stress Management", "Life Transitions"], languages: ["English", "Swahili", "Luo"],
        bio: "A trained peer counsellor who has been through campus burnout and came out the other side.",
    },
];

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
    for (const { fullName, email, type, amount, ...profile } of demoProfessionals) {
        if (await User.exists({ email })) continue;
        // Random password nobody knows: these accounts exist only to fill the directory.
        const password = await bcrypt.hash(crypto.randomUUID(), 12);
        const user = await User.create({ fullName, email, password, role: type });
        await Professional.create({
            user: user._id, type, status: "approved", rate: { amount }, availability: weekdays, ...profile,
        });
    }
    if (!(await Event.exists({ title: "Managing exam stress (sample)" }))) {
        await Event.create({
            title: "Managing exam stress (sample)",
            description: "A guided group session on practical ways to stay steady during exam season.",
            speaker: "Dr. Grace Wanjiku (sample)",
            eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            capacity: 50,
        });
    }
    console.log("Demo data: sample professionals and event are in place");
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

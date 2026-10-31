import express from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import authRoutes from "./modules/auth/auth.routes.js";
import professionalRoutes from "./modules/professionals/professional.routes.js";
import sessionRoutes from "./modules/sessions/session.routes.js";
import moodRoutes from "./modules/moods/mood.routes.js";
import journalRoutes from "./modules/journal/journal.routes.js";
import reminderRoutes from "./modules/reminders/reminder.routes.js";
import nuggetRoutes from "./modules/nuggets/nugget.routes.js";
import eventRoutes from "./modules/events/event.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import reviewRoutes from "./modules/reviews/review.routes.js";
import institutionRoutes from "./modules/institutions/institution.routes.js";
import googleRoutes from "./modules/google/google.routes.js";
import { CRISIS_CONTACTS } from "./utils/crisis.js";
import env from "./config/env.js";

const router = express.Router();

// Without its database the API can't do anything, so it isn't healthy.
export const healthAnswer = (readyState) => readyState === mongoose.ConnectionStates.connected
    ? { code: 200, status: "ok" }
    : { code: 503, status: "database unavailable" };

// The commit shows which code is live: after a failed deploy, the one before keeps running.
router.get("/health", (req, res) => {
    const { code, status } = healthAnswer(mongoose.connection.readyState);
    res.status(code).json({ status, commit: env.RAILWAY_GIT_COMMIT_SHA || null });
});
router.get("/crisis-contacts", (req, res) => res.json(CRISIS_CONTACTS));

// Everything below shares a limit per address, set high because a campus or a
// mobile network puts many people behind one. Health and the crisis contacts
// stay above it, so they always answer.
const limiter = (limit, skip) => rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => env.isTest || Boolean(skip?.(req)),
    message: { error: { code: "TOO_MANY_REQUESTS", message: "That's a lot of requests from this connection. Please wait a minute and try again" } },
});
const READS = ["GET", "HEAD", "OPTIONS"];
router.use(limiter(600));
// Each write can add to the database. The companion has its own limit per person.
router.use(limiter(120, (req) => READS.includes(req.method) || req.path.startsWith("/ai/")));

router.use("/auth", authRoutes);
router.use("/professionals", professionalRoutes);
router.use("/sessions", sessionRoutes);
router.use("/moods", moodRoutes);
router.use("/journal", journalRoutes);
router.use("/reminders", reminderRoutes);
router.use("/nuggets", nuggetRoutes);
router.use("/events", eventRoutes);
router.use("/ai", aiRoutes);
router.use("/admin", adminRoutes);
router.use("/reviews", reviewRoutes);
router.use("/institutions", institutionRoutes);
router.use("/google", googleRoutes);

export default router;

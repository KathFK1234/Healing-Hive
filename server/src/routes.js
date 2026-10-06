import express from "express";
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
import { CRISIS_CONTACTS } from "./utils/crisis.js";

const router = express.Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));
router.get("/crisis-contacts", (req, res) => res.json(CRISIS_CONTACTS));

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

export default router;

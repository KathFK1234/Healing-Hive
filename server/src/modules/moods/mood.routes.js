import express from "express";
import { z } from "zod";
import Mood from "./mood.model.js";
import ApiError from "../../utils/ApiError.js";
import { authenticate } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";

const router = express.Router();

const moodSchema = z.object({
    score: z.number().int().min(1).max(5),
    note: z.string().trim().max(500).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
});

const listSchema = z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
});

router.use(authenticate);

router.post("/", validate({ body: moodSchema }), async (req, res) => {
    const mood = await Mood.create({ user: req.user._id, ...req.body });
    res.status(201).json(mood);
});

// Check-ins for the signed-in person, newest first
router.get("/", validate({ query: listSchema }), async (req, res) => {
    const since = new Date(Date.now() - req.filters.days * 24 * 60 * 60 * 1000);
    const moods = await Mood.find({ user: req.user._id, createdAt: { $gte: since } }).sort({ createdAt: -1 });
    res.json(moods);
});

router.delete("/:id", validateId, async (req, res) => {
    const deleted = await Mood.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) throw ApiError.notFound("Check-in");
    res.json({ message: "Deleted" });
});

export default router;

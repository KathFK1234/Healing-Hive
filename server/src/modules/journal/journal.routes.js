import express from "express";
import { z } from "zod";
import Journal from "./journal.model.js";
import ApiError from "../../utils/ApiError.js";
import { authenticate } from "../../middleware/auth.js";
import { validate, validateId, objectId } from "../../middleware/validate.js";

const router = express.Router();

const entrySchema = z.object({
    title: z.string().trim().max(120).optional(),
    content: z.string().trim().min(1, "Write something before saving").max(20000),
    mood: z.number().int().min(1).max(5).nullable().optional(),
});

// client/src/pages/Journal.jsx has the same number: keep the two in step
const JOURNAL_PAGE_SIZE = 50;

// The next page starts after the last entry of the one before: its time, and
// its id for entries written at the same moment.
const listSchema = z.object({
    before: z.coerce.date().optional(),
    beforeId: objectId.optional(),
}).refine((value) => !value.beforeId || value.before, "beforeId needs before");

// A journal is private: every query below is scoped to the signed-in person,
// and no other role (admin included) has a route into it.
router.use(authenticate);

// Newest first, a page at a time, so a journal of any length can be read back
router.get("/", validate({ query: listSchema }), async (req, res) => {
    const { before, beforeId } = req.filters;
    const filter = { user: req.user._id };
    if (before) {
        filter.$or = beforeId
            ? [{ createdAt: { $lt: before } }, { createdAt: before, _id: { $lt: beforeId } }]
            : [{ createdAt: { $lt: before } }];
    }
    const entries = await Journal.find(filter).sort({ createdAt: -1, _id: -1 }).limit(JOURNAL_PAGE_SIZE);
    res.json(entries);
});

router.post("/", validate({ body: entrySchema }), async (req, res) => {
    const entry = await Journal.create({ user: req.user._id, ...req.body });
    res.status(201).json(entry);
});

// Saves the entry as sent: one saved without a title has none.
router.put("/:id", validateId, validate({ body: entrySchema }), async (req, res) => {
    const updated = await Journal.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        req.body.title ? req.body : { content: req.body.content, mood: req.body.mood, $unset: { title: 1 } },
        { returnDocument: "after", runValidators: true }
    );
    if (!updated) throw ApiError.notFound("Entry");
    res.json(updated);
});

router.delete("/:id", validateId, async (req, res) => {
    const deleted = await Journal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) throw ApiError.notFound("Entry");
    res.json({ message: "Deleted" });
});

export default router;

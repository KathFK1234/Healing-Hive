import express from "express";
import { z } from "zod";
import Journal from "./journal.model.js";
import ApiError from "../../utils/ApiError.js";
import { authenticate } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";

const router = express.Router();

const entrySchema = z.object({
    title: z.string().trim().max(120).optional(),
    content: z.string().trim().min(1, "Write something before saving").max(20000),
    mood: z.number().int().min(1).max(5).nullable().optional(),
});

// A journal is private: every query below is scoped to the signed-in person,
// and no other role (admin included) has a route into it.
router.use(authenticate);

router.get("/", async (req, res) => {
    const entries = await Journal.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200);
    res.json(entries);
});

router.post("/", validate({ body: entrySchema }), async (req, res) => {
    const entry = await Journal.create({ user: req.user._id, ...req.body });
    res.status(201).json(entry);
});

router.put("/:id", validateId, validate({ body: entrySchema }), async (req, res) => {
    const updated = await Journal.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        req.body,
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

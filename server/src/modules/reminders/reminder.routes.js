import express from "express";
import { z } from "zod";
import Reminder, { REMINDER_CHANNELS } from "./reminder.model.js";
import ApiError from "../../utils/ApiError.js";
import { authenticate } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";

const router = express.Router();

// No defaults here: the model supplies them on create, and an update must
// leave any field that was not sent exactly as it is.
const reminderSchema = z.object({
    message: z.string().trim().min(1, "Say what the reminder is for").max(140),
    time: z.number().int().min(0).max(1439),
    days: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day").max(7),
    channels: z.array(z.enum(REMINDER_CHANNELS)).min(1).optional(),
    enabled: z.boolean().optional(),
});

// all actions are authenticated per user
router.use(authenticate);

router.get("/", async (req, res) => {
    const reminders = await Reminder.find({ user: req.user._id }).sort({ time: 1 });
    res.json(reminders);
});

router.post("/", validate({ body: reminderSchema }), async (req, res) => {
    const count = await Reminder.countDocuments({ user: req.user._id });
    if (count >= 30) throw ApiError.badRequest("You have reached the limit of 30 reminders");
    const reminder = await Reminder.create({ user: req.user._id, ...req.body });
    res.status(201).json(reminder);
});

router.patch("/:id", validateId, validate({ body: reminderSchema.partial() }), async (req, res) => {
    const updated = await Reminder.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        req.body,
        { returnDocument: "after", runValidators: true }
    );
    if (!updated) throw ApiError.notFound("Reminder");
    res.json(updated);
});

router.delete("/:id", validateId, async (req, res) => {
    const deleted = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) throw ApiError.notFound("Reminder");
    res.json({ message: "Deleted" });
});

export default router;

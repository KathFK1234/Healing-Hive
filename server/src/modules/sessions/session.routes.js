import express from "express";
import { z } from "zod";
import sessionController from "./session.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate, validateId, objectId } from "../../middleware/validate.js";
import { SESSION_MODES } from "./session.model.js";

const router = express.Router();

const bookSchema = z.object({
    professionalId: objectId,
    scheduledAt: z.coerce.date(),
    mode: z.enum(SESSION_MODES).default("video"),
    clientNote: z.string().trim().max(1000).optional(),
});

const statusSchema = z.object({
    status: z.enum(["confirmed", "completed", "cancelled"]),
});

// The next page of completed sessions starts after the last one of the page
// before: its time, and its id for sessions at the same time.
const assignedSchema = z.object({
    status: z.literal("completed").optional(),
    before: z.coerce.date().optional(),
    beforeId: objectId.optional(),
});

const notesSchema = z.object({
    privateNotes: z.string().trim().max(5000),
});

router.use(authenticate);

router.post("/", validate({ body: bookSchema }), sessionController.bookSession);
router.get("/mine", sessionController.getMySessions);
router.get("/assigned", requireRole("therapist", "peer"), validate({ query: assignedSchema }), sessionController.getAssignedSessions);
router.patch("/:id/status", validateId, validate({ body: statusSchema }), sessionController.updateStatus);
router.put("/:id/notes", validateId, requireRole("therapist", "peer"), validate({ body: notesSchema }), sessionController.updateNotes);

export default router;

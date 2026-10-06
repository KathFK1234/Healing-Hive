import express from "express";
import { z } from "zod";
import eventController from "./event.controller.js";
import { authenticate, optionalAuth, requireRole } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";

const router = express.Router();

const eventSchema = z.object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(2000).optional(),
    speaker: z.string().trim().max(80).optional(),
    eventDate: z.coerce.date(),
    // no defaults here: the model supplies them, and updates must not reset fields
    durationMinutes: z.number().int().min(10).max(600).optional(),
    price: z.number().min(0).max(1000000).optional(),
    capacity: z.number().int().min(1).max(100000).optional(),
    joinLink: z.string().trim().url().max(500).optional(),
});

const listSchema = z.object({
    when: z.enum(["upcoming", "past"]).default("upcoming"),
});

// public list and details
router.get("/", optionalAuth, validate({ query: listSchema }), eventController.getEvents);
router.get("/:id", validateId, optionalAuth, eventController.getEvent);

// create / update (therapist, peer counsellor, admin)
router.post("/", authenticate, requireRole("therapist", "peer", "admin"), validate({ body: eventSchema }), eventController.createEvent);
router.patch("/:id", validateId, authenticate, requireRole("therapist", "peer", "admin"), validate({ body: eventSchema.partial() }), eventController.updateEvent);
router.delete("/:id", validateId, authenticate, requireRole("therapist", "peer", "admin"), eventController.deleteEvent);

//register / leave (authenticated users)
router.post("/:id/join", validateId, authenticate, eventController.joinEvent);
router.delete("/:id/join", validateId, authenticate, eventController.leaveEvent);

export default router;

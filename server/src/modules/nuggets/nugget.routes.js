import express from "express";
import { z } from "zod";
import nuggetController from "./nugget.controller.js";
import { authenticate, optionalAuth, requireRole } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";
import { NUGGET_STATUSES, NUGGET_TOPICS, NUGGET_TYPES } from "./nugget.model.js";

const router = express.Router();

const nuggetSchema = z.object({
    title: z.string().trim().min(3).max(120),
    content: z.string().trim().min(10).max(3000),
    topic: z.enum(NUGGET_TOPICS),
    // no defaults here: the model supplies them, and updates must not reset fields
    type: z.enum(NUGGET_TYPES).optional(),
    readMinutes: z.number().int().min(1).max(30).optional(),
    status: z.enum(NUGGET_STATUSES).optional(),
});

const listSchema = z.object({
    topic: z.enum(NUGGET_TOPICS).optional(),
    status: z.enum(NUGGET_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get("/", optionalAuth, validate({ query: listSchema }), nuggetController.getNuggets);
router.get("/today", nuggetController.getTodaysNugget);
router.get("/saved", authenticate, nuggetController.getSavedNuggets);
router.get("/:id", validateId, optionalAuth, nuggetController.getNugget);

// save / unsave for later (any signed-in person)
router.put("/:id/save", validateId, authenticate, nuggetController.saveNugget);
router.delete("/:id/save", validateId, authenticate, nuggetController.unsaveNugget);

// professionals submit for review; admins edit, publish and delete
router.post("/", authenticate, requireRole("therapist", "peer", "admin"), validate({ body: nuggetSchema }), nuggetController.createNugget);
router.patch("/:id", validateId, authenticate, requireRole("admin"), validate({ body: nuggetSchema.partial() }), nuggetController.updateNugget);
router.delete("/:id", validateId, authenticate, requireRole("admin"), nuggetController.deleteNugget);

export default router;

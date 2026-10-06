import express from "express";
import { z } from "zod";
import professionalController from "./professional.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";
import { applySchema, updateSchema } from "./professional.schemas.js";

const router = express.Router();

const listSchema = z.object({
    q: z.string().trim().max(60).optional(),
    type: z.enum(["therapist", "peer"]).optional(),
    specialty: z.string().trim().max(40).optional(),
    language: z.string().trim().max(40).optional(),
    sort: z.enum(["soonest", "price", "experience", "rating"]).default("soonest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
});

// The signed-in professional's own profile and application
router.get("/me", authenticate, professionalController.getMyProfile);
router.post("/apply", authenticate, requireRole("user"), validate({ body: applySchema }), professionalController.apply);
router.patch("/me", authenticate, requireRole("therapist", "peer", "institution"), validate({ body: updateSchema }), professionalController.updateMyProfile);

// Answering an institution's invitation, or leaving one
router.post("/me/institution", authenticate, requireRole("therapist", "peer"), validate({ body: z.object({ accept: z.boolean() }) }), professionalController.answerInvitation);

// Public directory
router.get("/", validate({ query: listSchema }), professionalController.listProfessionals);
router.get("/filters", professionalController.getFilters);
router.get("/:id", validateId, professionalController.getProfessional);
router.get("/:id/reviews", validateId, professionalController.getReviews);

export default router;

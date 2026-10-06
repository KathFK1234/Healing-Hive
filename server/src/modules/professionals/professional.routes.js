import express from "express";
import { z } from "zod";
import professionalController from "./professional.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";
import { PROFESSIONAL_TYPES } from "./professional.model.js";

const router = express.Router();

const tags = z.array(z.string().trim().min(1).max(40)).max(12);

const availability = z.array(z.object({
    day: z.number().int().min(0).max(6),
    start: z.number().int().min(0).max(1439),
    end: z.number().int().min(1).max(1440),
}).refine((window) => window.end > window.start, "End time must be after start time")).max(21);

// Fields a professional may change about themselves at any time.
const profileFields = {
    title: z.string().trim().max(80).optional(),
    bio: z.string().trim().max(1500).optional(),
    specialties: tags.optional(),
    languages: tags.optional(),
    location: z.string().trim().max(80).optional(),
    yearsExperience: z.number().int().min(0).max(70).optional(),
    rate: z.object({ amount: z.number().min(0).max(1000000) }).optional(),
    sessionMinutes: z.number().int().min(15).max(180).optional(),
    availability: availability.optional(),
};

const applySchema = z.object({
    type: z.enum(PROFESSIONAL_TYPES),
    licenseNumber: z.string().trim().max(60).optional(),
    ...profileFields,
});

const listSchema = z.object({
    q: z.string().trim().max(60).optional(),
    type: z.enum(["therapist", "peer"]).optional(),
    specialty: z.string().trim().max(40).optional(),
    language: z.string().trim().max(40).optional(),
    sort: z.enum(["soonest", "price", "experience"]).default("soonest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
});

// The signed-in professional's own profile and application
router.get("/me", authenticate, professionalController.getMyProfile);
router.post("/apply", authenticate, requireRole("user"), validate({ body: applySchema }), professionalController.apply);
router.patch("/me", authenticate, requireRole("therapist", "peer", "institution"), validate({ body: z.object(profileFields) }), professionalController.updateMyProfile);

// Public directory
router.get("/", validate({ query: listSchema }), professionalController.listProfessionals);
router.get("/filters", professionalController.getFilters);
router.get("/:id", validateId, professionalController.getProfessional);

export default router;

import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import professionalController from "./professional.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";
import { applySchema, updateSchema } from "./professional.schemas.js";
import { readCertificate } from "./certificate.js";
import env from "../../config/env.js";

const router = express.Router();

// Each upload is up to 5 MB read, checked and written: plenty for someone
// fixing a blurry scan, not for someone hammering the database.
const certificateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.isTest,
    keyGenerator: (req) => req.user._id.toString(),
    message: { error: { code: "TOO_MANY_REQUESTS", message: "You have uploaded a certificate many times in the last hour. Please wait a while and try again" } },
});

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
// The certificate that verifies a therapist or peer counsellor: only they and admins can read it
router.put("/me/certificate", authenticate, certificateLimiter, readCertificate, professionalController.uploadCertificate);
router.get("/me/certificate", authenticate, professionalController.downloadMyCertificate);

// Answering an institution's invitation, or leaving one
router.post("/me/institution", authenticate, requireRole("therapist", "peer"), validate({ body: z.object({ accept: z.boolean() }) }), professionalController.answerInvitation);

// Public directory
router.get("/", validate({ query: listSchema }), professionalController.listProfessionals);
router.get("/filters", professionalController.getFilters);
router.get("/:id", validateId, professionalController.getProfessional);
router.get("/:id/reviews", validateId, professionalController.getReviews);

export default router;

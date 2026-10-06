import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import authController from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import env from "../../config/env.js";
import { applySchema } from "../professionals/professional.schemas.js";

const router = express.Router();

// Slows down password guessing. Counted per IP address, and only failed
// attempts count: mobile networks and campuses put many people behind one
// address, and they must not be locked out by each other's normal sign-ins.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait a few minutes and try again" } },
});

// Reset requests always "succeed", so they need their own limit that counts
// every request. Otherwise the form could be used to flood someone's inbox.
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many reset requests. Please wait an hour and try again" } },
});

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const password = z.string().min(8, "Use at least 8 characters for your password").max(128);
const phone = z.string().trim().regex(/^\+?[\d\s-]{9,15}$/, "Enter a valid phone number");

const registerSchema = z.object({
    fullName: z.string().trim().min(2, "Enter your name").max(80),
    email,
    password,
    phone: phone.optional(),
});

// A professional's account details plus their application, sent together.
// A phone number is required: we may need to call to verify credentials.
const registerProfessionalSchema = registerSchema.extend({
    phone,
    application: applySchema,
});

const forgotSchema = z.object({ email });

const resetSchema = z.object({
    token: z.string().min(20).max(200),
    newPassword: password,
});

const loginSchema = z.object({
    email,
    password: z.string().min(1, "Enter your password"),
});

const profileSchema = z.object({
    fullName: z.string().trim().min(2).max(80).optional(),
    phone: phone.or(z.literal("")).optional(),
    preferredLanguage: z.string().trim().max(40).optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: password,
});

router.post("/register", authLimiter, validate({ body: registerSchema }), authController.register);
router.post("/register-professional", authLimiter, validate({ body: registerProfessionalSchema }), authController.registerProfessional);
router.post("/forgot-password", resetLimiter, validate({ body: forgotSchema }), authController.forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetSchema }), authController.resetPassword);
router.post("/login", authLimiter, validate({ body: loginSchema }), authController.login);
router.get("/me", authenticate, authController.getProfile);
router.patch("/me", authenticate, validate({ body: profileSchema }), authController.updateProfile);
router.post("/change-password", authenticate, authLimiter, validate({ body: passwordSchema }), authController.changePassword);

export default router;

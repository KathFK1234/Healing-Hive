import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import authController from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import env from "../../config/env.js";

const router = express.Router();

// Slows down password guessing. Counted per IP address.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait a few minutes and try again" } },
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
router.post("/login", authLimiter, validate({ body: loginSchema }), authController.login);
router.get("/me", authenticate, authController.getProfile);
router.patch("/me", authenticate, validate({ body: profileSchema }), authController.updateProfile);
router.post("/change-password", authenticate, authLimiter, validate({ body: passwordSchema }), authController.changePassword);

export default router;

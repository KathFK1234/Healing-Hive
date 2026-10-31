import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import aiController from "./ai.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import env from "../../config/env.js";
import { looksLikeCrisis } from "../../utils/crisis.js";

const router = express.Router();

// Each message costs money upstream, so cap how fast one person can send them.
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 15,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.isTest,
    keyGenerator: (req) => req.user._id.toString(),
    message: { error: { code: "TOO_MANY_REQUESTS", message: "You are sending messages very quickly. Take a breath and try again in a minute" } },
    // Someone in crisis is never told to wait: they get the safety reply, which
    // costs nothing upstream.
    handler: (req, res, next, options) => {
        if (typeof req.body?.message === "string" && looksLikeCrisis(req.body.message)) {
            req.overChatLimit = true;
            return next();
        }
        res.status(options.statusCode).json(options.message);
    },
});

const messageSchema = z.object({
    message: z.string().trim().min(1, "Type a message first").max(2000),
});

router.use(authenticate);

router.get("/messages", aiController.getAiMessages);
router.post("/messages", chatLimiter, validate({ body: messageSchema }), aiController.sendAiMessage);
router.delete("/messages", aiController.clearAiMessages);

export default router;

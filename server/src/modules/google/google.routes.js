import express from "express";
import env from "../../config/env.js";
import ApiError from "../../utils/ApiError.js";
import Professional from "../professionals/professional.model.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { connectUrl, readState, exchangeCode, encrypt, decrypt, revoke, forget } from "./google.service.js";

const router = express.Router();

const mine = (req) => Professional.findOne({ user: req.user._id }).select("+google calendarConnected");

router.get("/status", authenticate, requireRole("therapist", "peer"), async (req, res) => {
    const professional = await mine(req);
    res.json({
        available: env.googleEnabled,
        connected: Boolean(professional?.calendarConnected),
        email: professional?.calendarConnected ? professional.google?.email : undefined,
    });
});

// Step 1: the web app asks for the address to send the professional to.
router.get("/connect", authenticate, requireRole("therapist", "peer"), async (req, res) => {
    if (!env.googleEnabled) throw new ApiError(503, "GOOGLE_NOT_CONFIGURED", "Google Calendar is not set up on this server yet");
    res.json({ url: connectUrl(req.user._id) });
});

// Step 2: Google sends the professional's browser back here. This is a page
// navigation, not an API call, so it always ends in a redirect to the web app.
router.get("/callback", async (req, res) => {
    const back = (result) => res.redirect(`${env.clientUrl}/practice?calendar=${result}`);
    if (!env.googleEnabled || req.query.error || !req.query.code || !req.query.state) return back("cancelled");

    try {
        const userId = readState(String(req.query.state));
        const professional = await Professional.findOne({ user: userId, status: "approved" });
        if (!professional) return back("failed");

        const { refreshToken, email } = await exchangeCode(String(req.query.code));
        professional.google = { refreshToken: encrypt(refreshToken), email };
        professional.calendarConnected = true;
        await professional.save();
        forget(professional._id);
        back("connected");
    } catch (err) {
        console.error("Google connect failed:", err.message);
        back("failed");
    }
});

router.delete("/connect", authenticate, requireRole("therapist", "peer"), async (req, res) => {
    const professional = await mine(req);
    if (professional?.google?.refreshToken) {
        try {
            await revoke(decrypt(professional.google.refreshToken));
        } catch {
            // Already unusable: still remove our copy below.
        }
    }
    if (professional) {
        professional.google = undefined;
        professional.calendarConnected = false;
        await professional.save();
        forget(professional._id);
    }
    res.json({ connected: false });
});

export default router;

import express from "express";
import { z } from "zod";
import User from "../users/user.model.js";
import Professional, { APPLICATION_STATUSES } from "../professionals/professional.model.js";
import Session from "../sessions/session.model.js";
import Nugget from "../nuggets/nugget.model.js";
import ApiError from "../../utils/ApiError.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";
import env from "../../config/env.js";
import { sendMail } from "../../utils/mailer.js";

const router = express.Router();

const reviewSchema = z.object({
    status: z.enum(["approved", "rejected"]),
    reviewNote: z.string().trim().max(500).optional(),
});

const listSchema = z.object({
    status: z.enum(APPLICATION_STATUSES).default("pending"),
});

router.use(authenticate, requireRole("admin"));

// Headline numbers for the admin dashboard. Counts only: admins have no route
// into anyone's journal, mood log or AI conversation.
router.get("/stats", async (req, res) => {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [users, newUsers, professionals, pendingApplications, upcomingSessions, completedSessions, publishedNuggets, nuggetsInReview] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ createdAt: { $gte: monthAgo } }),
        Professional.countDocuments({ status: "approved" }),
        Professional.countDocuments({ status: "pending" }),
        Session.countDocuments({ active: true, scheduledAt: { $gte: new Date() } }),
        Session.countDocuments({ status: "completed" }),
        Nugget.countDocuments({ status: "published" }),
        Nugget.countDocuments({ status: "review" }),
    ]);
    res.json({ users, newUsers, professionals, pendingApplications, upcomingSessions, completedSessions, publishedNuggets, nuggetsInReview });
});

router.get("/applications", validate({ query: listSchema }), async (req, res) => {
    const applications = await Professional.find({ status: req.filters.status })
        .select("+licenseNumber")
        .sort({ updatedAt: -1 })
        .limit(100)
        .populate("user", "fullName email phone");
    res.json(applications);
});

// Approving an application is the only way an account becomes a professional.
router.patch("/applications/:id", validateId, validate({ body: reviewSchema }), async (req, res) => {
    const application = await Professional.findById(req.params.id);
    if (!application) throw ApiError.notFound("Application");

    application.status = req.body.status;
    application.reviewNote = req.body.reviewNote;
    await application.save();

    const approved = req.body.status === "approved";
    const role = approved ? application.type : "user";
    await User.updateOne({ _id: application.user, role: { $ne: "admin" } }, { role });

    // Being removed from the directory also ends any institution membership,
    // and an institution that is removed no longer has members.
    if (!approved) {
        await Professional.updateOne({ _id: application._id }, { $unset: { institution: 1, institutionStatus: 1 } });
        await Professional.updateMany({ institution: application._id }, { $unset: { institution: 1, institutionStatus: 1 } });
    }

    const applicant = await User.findById(application.user).select("fullName email");
    if (applicant) {
        await sendMail({
            to: applicant.email,
            subject: approved ? "You are approved on Healing Hive" : "Your Healing Hive application needs changes",
            text: approved
                ? `Hello ${applicant.fullName},\n\nGood news: your application has been approved. Sign in to finish setting up:\n${env.clientUrl}/login`
                : `Hello ${applicant.fullName},\n\nWe could not approve your application yet.${req.body.reviewNote ? `\n\nWhat needs to change: ${req.body.reviewNote}` : ""}\n\nYou can update it and send it again here:\n${env.clientUrl}/apply`,
        });
    }

    res.json(application);
});

router.get("/users", async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 }).limit(50).select("fullName email role createdAt");
    res.json(users);
});

export default router;

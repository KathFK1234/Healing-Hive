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
import { cancelMeeting } from "../sessions/meeting.js";
import { when } from "../sessions/session.controller.js";
import Certificate from "../professionals/certificate.model.js";
import { certificateSummary, sendCertificate } from "../professionals/certificate.js";

const router = express.Router();

const reviewSchema = z.object({
    status: z.enum(["approved", "rejected"]),
    reviewNote: z.string().trim().max(500).optional(),
});

const listSchema = z.object({
    status: z.enum(APPLICATION_STATUSES).default("pending"),
});

router.use(authenticate, requireRole("admin"));

// A professional taken out of the directory loses their practice page, so
// nobody would be left to confirm or hold their upcoming sessions, or one
// that is under way. Cancel them and tell each client, as a cancellation by
// the professional would. Sessions that have ended are left as they are.
async function cancelUpcomingSessions(professional, professionalName) {
    const now = new Date();
    const endsAt = { $add: ["$scheduledAt", { $multiply: ["$durationMinutes", 60 * 1000] }] };
    const sessions = await Session.find({
        professional: professional._id,
        active: true,
        $or: [{ scheduledAt: { $gte: now } }, { status: "confirmed", $expr: { $gt: [endsAt, now] } }],
    })
        .select("+googleEventId")
        .populate("client", "fullName email");
    for (const session of sessions) {
        await cancelMeeting(session);
        session.status = "cancelled";
        session.meetingUrl = undefined;
        session.googleEventId = undefined;
        await session.save();
        if (session.client) {
            await sendMail({
                to: session.client.email,
                subject: "A Healing Hive session was cancelled",
                text: `Hello ${session.client.fullName},\n\nYour session with ${professionalName} on ${when(session.scheduledAt)} has been cancelled, because they are no longer listed on Healing Hive.\n\nYou can book someone else here:\n${env.clientUrl}/therapists`,
            });
        }
    }
    return sessions.length;
}

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
    const certificates = await Certificate.find({ professional: { $in: applications.map((application) => application._id) } });
    const byProfessional = new Map(certificates.map((certificate) => [certificate.professional.toString(), certificateSummary(certificate)]));
    res.json(applications.map((application) => ({ ...application.toJSON(), certificate: byProfessional.get(application._id.toString()) || null })));
});

router.get("/applications/:id/certificate", validateId, async (req, res) => {
    await sendCertificate(res, req.params.id);
});

// Approving an application is the only way an account becomes a professional.
router.patch("/applications/:id", validateId, validate({ body: reviewSchema }), async (req, res) => {
    const application = await Professional.findById(req.params.id);
    if (!application) throw ApiError.notFound("Application");
    // A therapist or peer counsellor is listed only once their certificate has been seen
    if (req.body.status === "approved" && application.type !== "institution" && !(await Certificate.exists({ professional: application._id }))) {
        throw ApiError.badRequest("This application has no certificate yet, so it can't be approved. Ask them to upload one from their practice page");
    }

    const wasListed = application.status === "approved";
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
    const cancelled = !approved && wasListed ? await cancelUpcomingSessions(application, applicant?.fullName || "your professional") : 0;
    if (applicant) {
        await sendMail({
            to: applicant.email,
            subject: approved ? "You are approved on Healing Hive" : wasListed ? "You were removed from the Healing Hive directory" : "Your Healing Hive application needs changes",
            text: approved
                ? `Hello ${applicant.fullName},\n\nGood news: your application has been approved. Sign in to finish setting up:\n${env.clientUrl}/login`
                : `Hello ${applicant.fullName},\n\n${wasListed ? `You are no longer listed on Healing Hive.${cancelled ? " Your upcoming sessions have been cancelled, and their clients have been told." : ""}` : "We could not approve your application yet."}${req.body.reviewNote ? `\n\n${wasListed ? "Why" : "What needs to change"}: ${req.body.reviewNote}` : ""}\n\nYou can update your application and send it again here:\n${env.clientUrl}/apply`,
        });
    }

    res.json(application);
});

const PEOPLE_PER_PAGE = 50;
const peopleSchema = z.object({
    // MongoDB refuses a regular expression holding a NUL byte, and no name has one
    q: z.string().trim().max(80).transform((text) => text.replaceAll("\0", "")).optional(),
    page: z.coerce.number().int().min(1).default(1),
});

// Everyone, newest first, a page at a time; q matches a name or an email.
router.get("/users", validate({ query: peopleSchema }), async (req, res) => {
    const { q, page } = req.filters;
    const pattern = q && new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filter = pattern ? { $or: [{ fullName: pattern }, { email: pattern }] } : {};
    const [items, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PEOPLE_PER_PAGE).limit(PEOPLE_PER_PAGE).select("fullName email role createdAt"),
        User.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / PEOPLE_PER_PAGE)) });
});

export default router;

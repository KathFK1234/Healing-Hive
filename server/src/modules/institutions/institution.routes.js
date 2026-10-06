import express from "express";
import { z } from "zod";
import User from "../users/user.model.js";
import Professional from "../professionals/professional.model.js";
import Session from "../sessions/session.model.js";
import ApiError from "../../utils/ApiError.js";
import env from "../../config/env.js";
import { sendMail } from "../../utils/mailer.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate, validateId } from "../../middleware/validate.js";

const router = express.Router();

const inviteSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

router.use(authenticate, requireRole("institution"));

async function myInstitution(req) {
    const institution = await Professional.findOne({ user: req.user._id, type: "institution", status: "approved" });
    if (!institution) throw ApiError.notFound("Institution");
    return institution;
}

// Everything the institution dashboard shows. An institution sees how busy its
// people are, never who their clients are or what was said.
router.get("/me", async (req, res) => {
    const institution = await myInstitution(req);
    const members = await Professional.find({ institution: institution._id })
        .select("type title specialties rate sessionMinutes ratingAverage ratingCount institutionStatus user")
        .populate("user", "fullName email")
        .lean();

    const now = new Date();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stats = await Session.aggregate([
        { $match: { professional: { $in: members.map((member) => member._id) } } },
        {
            $group: {
                _id: "$professional",
                upcoming: { $sum: { $cond: [{ $and: ["$active", { $gt: ["$scheduledAt", now] }] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                completedThisMonth: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $gt: ["$scheduledAt", monthAgo] }] }, 1, 0] } },
                completedValue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, { $ifNull: ["$price.amount", 0] }, 0] } },
                clients: { $addToSet: "$client" },
            },
        },
    ]);
    const statsById = new Map(stats.map((row) => [row._id.toString(), row]));

    const rows = members.map((member) => {
        const row = statsById.get(member._id.toString());
        return {
            ...member,
            stats: {
                upcoming: row?.upcoming || 0,
                completed: row?.completed || 0,
                completedThisMonth: row?.completedThisMonth || 0,
                completedValue: row?.completedValue || 0,
                clients: row?.clients.length || 0,
            },
        };
    });

    const active = rows.filter((row) => row.institutionStatus === "active");
    const total = (key) => active.reduce((sum, row) => sum + row.stats[key], 0);
    const rated = active.filter((row) => row.ratingCount > 0);
    const reviews = rated.reduce((sum, row) => sum + row.ratingCount, 0);

    res.json({
        institution,
        members: rows,
        totals: {
            members: active.length,
            invited: rows.length - active.length,
            upcoming: total("upcoming"),
            completed: total("completed"),
            completedThisMonth: total("completedThisMonth"),
            completedValue: total("completedValue"),
            // A person seeing two of the institution's professionals counts twice here
            clients: total("clients"),
            ratingAverage: reviews ? Math.round((rated.reduce((sum, row) => sum + row.ratingAverage * row.ratingCount, 0) / reviews) * 10) / 10 : 0,
            ratingCount: reviews,
        },
    });
});

// Invite an approved therapist or peer counsellor. They have to accept before
// they count as part of the institution.
router.post("/me/members", validate({ body: inviteSchema }), async (req, res) => {
    const institution = await myInstitution(req);

    const user = await User.findOne({ email: req.body.email });
    const professional = user && await Professional.findOne({ user: user._id, status: "approved", type: { $in: ["therapist", "peer"] } });
    if (!professional) {
        throw ApiError.badRequest("No approved therapist or peer counsellor on Healing Hive uses that email. Ask them to join and get verified first");
    }
    if (professional.institution) {
        throw ApiError.conflict(professional.institution.equals(institution._id)
            ? "They have already been invited"
            : "They already belong to another institution");
    }

    professional.institution = institution._id;
    professional.institutionStatus = "invited";
    await professional.save();

    await sendMail({
        to: user.email,
        subject: `${institution.organisationName} invited you on Healing Hive`,
        text: `Hello ${user.fullName},\n\n${institution.organisationName} has invited you to be listed as part of their team on Healing Hive.\n\nYou can accept or decline from your practice page:\n${env.clientUrl}/practice\n\nNothing changes unless you accept.`,
    });
    res.status(201).json({ message: "Invitation sent" });
});

router.delete("/me/members/:id", validateId, async (req, res) => {
    const institution = await myInstitution(req);
    const removed = await Professional.findOneAndUpdate(
        { _id: req.params.id, institution: institution._id },
        { $unset: { institution: 1, institutionStatus: 1 } },
    );
    if (!removed) throw ApiError.notFound("Member");
    res.json({ message: "Removed" });
});

export default router;

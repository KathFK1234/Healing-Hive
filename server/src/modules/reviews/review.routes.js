import express from "express";
import { z } from "zod";
import Review from "./review.model.js";
import Session from "../sessions/session.model.js";
import Professional from "../professionals/professional.model.js";
import ApiError from "../../utils/ApiError.js";
import { authenticate } from "../../middleware/auth.js";
import { validate, objectId } from "../../middleware/validate.js";

const router = express.Router();

const reviewSchema = z.object({
    sessionId: objectId,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
});

// Recalculates the professional's average from all their reviews.
async function refreshRating(professionalId) {
    const [summary] = await Review.aggregate([
        { $match: { professional: professionalId } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    await Professional.updateOne(
        { _id: professionalId },
        { ratingAverage: summary ? Math.round(summary.average * 10) / 10 : 0, ratingCount: summary?.count || 0 },
    );
}

// Only the client of a completed session can review it, once. Sending again
// updates the same review.
router.put("/", authenticate, validate({ body: reviewSchema }), async (req, res) => {
    const { sessionId, rating, comment } = req.body;

    const session = await Session.findOne({ _id: sessionId, client: req.user._id });
    if (!session) throw ApiError.notFound("Session");
    if (session.status !== "completed") throw ApiError.badRequest("You can rate a session once it is completed");

    const review = await Review.findOneAndUpdate(
        { session: session._id },
        { client: req.user._id, professional: session.professional, rating, comment },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
    await refreshRating(session.professional);
    res.json(review);
});

export default router;

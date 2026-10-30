import Session from "./session.model.js";
import Professional from "../professionals/professional.model.js";
import ApiError from "../../utils/ApiError.js";
import Review from "../reviews/review.model.js";
import User from "../users/user.model.js";
import env from "../../config/env.js";
import { openSlots } from "../professionals/slots.js";
import { busyTimes } from "../google/google.service.js";
import { arrangeMeeting, cancelMeeting } from "./meeting.js";
import { sendMail } from "../../utils/mailer.js";

// Always East Africa Time in emails, whatever the server's own clock is set to.
export const when = (date) => new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true,
}).format(date) + " (East Africa Time)";

const WITH_PROFESSIONAL = {
    path: "professional",
    select: "type title specialties user",
    populate: { path: "user", select: "fullName" },
};

// Each waiting request holds its time away from everyone else until it is
// answered, so one account cannot sit on a professional's (or everyone's) diary.
const MAX_WAITING_PER_PROFESSIONAL = 3;
const MAX_WAITING = 10;

// One booking at a time per person, or requests sent together would each pass
// the waiting limits below before any of them is saved. In memory: the API
// runs as a single instance.
const bookingNow = new Set();

async function bookSession(req, res) {
    const client = req.user._id.toString();
    if (bookingNow.has(client)) throw ApiError.conflict("Your last request is still being sent. Please try again in a moment");
    bookingNow.add(client);
    try {
        await requestSession(req, res);
    } finally {
        bookingNow.delete(client);
    }
}

async function requestSession(req, res) {
    const { professionalId, scheduledAt, mode, clientNote } = req.body;

    const professional = await Professional.findOne({ _id: professionalId, status: "approved", type: { $ne: "institution" } })
        .populate("user", "fullName email");
    if (!professional) throw ApiError.notFound("Professional");
    if (professional.user._id.equals(req.user._id)) throw ApiError.badRequest("You cannot book a session with yourself");

    const waiting = await Session.find({ client: req.user._id, status: "pending", scheduledAt: { $gt: new Date() } }).select("professional");
    if (waiting.filter((session) => session.professional.equals(professional._id)).length >= MAX_WAITING_PER_PROFESSIONAL) {
        throw ApiError.badRequest(`You already have ${MAX_WAITING_PER_PROFESSIONAL} requests waiting for ${professional.user.fullName} to answer. Wait for a reply, or cancel one from your sessions page, before asking for another time`);
    }
    if (waiting.length >= MAX_WAITING) {
        throw ApiError.badRequest(`You have ${MAX_WAITING} session requests waiting for an answer. Wait for replies, or cancel one from your sessions page, before asking for another`);
    }

    const taken = await Session.find({ professional: professional._id, active: true, scheduledAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        .select("scheduledAt durationMinutes");
    const busy = await busyTimes(professional);
    const isOpen = openSlots(professional, taken, new Date(), busy).some((slot) => slot.getTime() === scheduledAt.getTime());
    if (!isOpen) throw ApiError.conflict("That time is no longer available. Please pick another");

    let session;
    try {
        session = await Session.create({
            client: req.user._id,
            professional: professional._id,
            scheduledAt,
            durationMinutes: professional.sessionMinutes,
            mode,
            clientNote,
            price: { currency: professional.rate.currency, amount: professional.rate.amount },
        });
    } catch (err) {
        // Someone else took the slot between the check above and the insert.
        if (err.code === 11000) throw ApiError.conflict("That time was just taken. Please pick another");
        throw err;
    }

    await sendMail({
        to: professional.user.email,
        subject: "New session request on Healing Hive",
        text: `Hello ${professional.user.fullName},\n\n${req.user.fullName} has asked for a session on ${when(scheduledAt)}.\n\nAccept or decline it from your practice page:\n${env.clientUrl}/practice`,
    });
    res.status(201).json(await session.populate(WITH_PROFESSIONAL));
}

// Sessions the signed-in person booked as a client
async function getMySessions(req, res) {
    const sessions = await Session.find({ client: req.user._id })
        .sort({ scheduledAt: -1 })
        .limit(100)
        .populate(WITH_PROFESSIONAL)
        .lean();

    // Attach the rating the person already gave, so the page knows whether to ask.
    const reviews = await Review.find({ session: { $in: sessions.map((session) => session._id) } }).select("session rating comment");
    const bySession = new Map(reviews.map((review) => [review.session.toString(), review]));
    for (const session of sessions) {
        const review = bySession.get(session._id.toString());
        session.review = review ? { rating: review.rating, comment: review.comment } : null;
    }
    res.json(sessions);
}

// client/src/pages/Practice.jsx has the same number: keep the two in step
const COMPLETED_PAGE_SIZE = 20;

// Sessions booked with the signed-in professional: the work still open
// (requests not yet past, and confirmed sessions until they are marked
// completed), or with status=completed their finished sessions a page at a
// time, so the notes on every one of them can still be opened.
async function getAssignedSessions(req, res) {
    const professional = await Professional.findOne({ user: req.user._id });
    if (!professional) return res.json([]);

    const { status, before, beforeId } = req.filters;
    let filter;
    if (status === "completed") {
        filter = { professional: professional._id, status: "completed" };
        if (before) {
            filter.$or = beforeId
                ? [{ scheduledAt: { $lt: before } }, { scheduledAt: before, _id: { $lt: beforeId } }]
                : [{ scheduledAt: { $lt: before } }];
        }
    } else {
        filter = {
            professional: professional._id,
            $or: [{ status: "pending", scheduledAt: { $gt: new Date() } }, { status: "confirmed" }],
        };
    }

    const sessions = await Session.find(filter)
        .select("+privateNotes")
        .sort({ scheduledAt: -1, _id: -1 })
        .limit(status === "completed" ? COMPLETED_PAGE_SIZE : 200)
        .populate("client", "fullName");
    res.json(sessions);
}

// Who may move a session from one status to another.
const TRANSITIONS = {
    client: { pending: ["cancelled"], confirmed: ["cancelled"] },
    professional: { pending: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"] },
};

async function findForParticipant(req, extraSelect = "") {
    const session = await Session.findById(req.params.id)
        .select(extraSelect)
        .populate("professional", "user calendarConnected meetingLink");
    if (!session) throw ApiError.notFound("Session");

    const isClient = session.client.equals(req.user._id);
    const isProfessional = session.professional?.user.equals(req.user._id);
    // 404 rather than 403, so ids of other people's sessions cannot be probed.
    if (!isClient && !isProfessional) throw ApiError.notFound("Session");
    return { session, as: isProfessional ? "professional" : "client" };
}

async function updateStatus(req, res) {
    const { session, as } = await findForParticipant(req, "+googleEventId");
    const allowed = TRANSITIONS[as][session.status] || [];
    if (!allowed.includes(req.body.status)) {
        throw ApiError.badRequest(`A ${session.status} session cannot be marked ${req.body.status}`);
    }
    // Once it has started, a session is part of both people's records: the
    // client cannot cancel it away (the professional still can, for a no-show).
    if (req.body.status === "cancelled" && as === "client" && session.scheduledAt <= new Date()) {
        throw ApiError.badRequest("This session has already started, so it can't be cancelled");
    }
    // A request nobody answered in time reads "Not confirmed in time" to the
    // client; confirming it now would send a join link for a time that has gone.
    if (req.body.status === "confirmed" && session.scheduledAt <= new Date()) {
        throw ApiError.badRequest("This request's time has passed, so it can't be confirmed. You can still decline it");
    }
    if (req.body.status === "completed" && session.scheduledAt > new Date()) {
        throw ApiError.badRequest("A session cannot be completed before it has started");
    }

    const [client, professionalUser] = await Promise.all([
        User.findById(session.client).select("fullName email"),
        User.findById(session.professional.user).select("fullName email"),
    ]);

    if (req.body.status === "confirmed") {
        const meeting = await arrangeMeeting({
            session,
            professional: session.professional,
            clientEmail: client.email,
            professionalName: professionalUser.fullName,
        });
        session.meetingUrl = meeting.meetingUrl;
        session.googleEventId = meeting.googleEventId;
    }
    if (req.body.status === "cancelled") {
        await cancelMeeting(session);
        session.meetingUrl = undefined;
        session.googleEventId = undefined;
    }

    session.status = req.body.status;
    await session.save();

    if (req.body.status === "confirmed") {
        await sendMail({
            to: client.email,
            subject: "Your Healing Hive session is confirmed",
            text: `Hello ${client.fullName},\n\n${professionalUser.fullName} has confirmed your session on ${when(session.scheduledAt)}.\n\nJoin here when it is time:\n${session.meetingUrl}\n\nYou can also join, or cancel if your plans change, from your sessions page:\n${env.clientUrl}/sessions`,
        });
    }
    if (req.body.status === "cancelled") {
        // Tell whoever did not do the cancelling
        const other = as === "client" ? professionalUser : client;
        const by = as === "client" ? client : professionalUser;
        await sendMail({
            to: other.email,
            subject: "A Healing Hive session was cancelled",
            text: `Hello ${other.fullName},\n\n${by.fullName} has cancelled the session on ${when(session.scheduledAt)}.${as === "professional" ? `\n\nYou can book another time here:\n${env.clientUrl}/therapists` : ""}`,
        });
    }

    const { googleEventId, ...result } = session.toObject();
    res.json(result);
}

async function updateNotes(req, res) {
    const { session, as } = await findForParticipant(req, "+privateNotes");
    if (as !== "professional") throw ApiError.forbidden();

    session.privateNotes = req.body.privateNotes;
    await session.save();
    res.json({ _id: session._id, privateNotes: session.privateNotes });
}

export default {
    bookSession,
    getMySessions,
    getAssignedSessions,
    updateStatus,
    updateNotes
}

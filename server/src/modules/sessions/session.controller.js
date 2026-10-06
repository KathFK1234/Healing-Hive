import Session from "./session.model.js";
import Professional from "../professionals/professional.model.js";
import ApiError from "../../utils/ApiError.js";
import { openSlots } from "../professionals/slots.js";

const WITH_PROFESSIONAL = {
    path: "professional",
    select: "type title specialties user",
    populate: { path: "user", select: "fullName" },
};

async function bookSession(req, res) {
    const { professionalId, scheduledAt, mode, clientNote } = req.body;

    const professional = await Professional.findOne({ _id: professionalId, status: "approved" });
    if (!professional) throw ApiError.notFound("Professional");
    if (professional.user.equals(req.user._id)) throw ApiError.badRequest("You cannot book a session with yourself");

    const taken = await Session.find({ professional: professional._id, active: true, scheduledAt: { $gte: new Date() } })
        .distinct("scheduledAt");
    const isOpen = openSlots(professional, taken).some((slot) => slot.getTime() === scheduledAt.getTime());
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

    res.status(201).json(await session.populate(WITH_PROFESSIONAL));
}

// Sessions the signed-in person booked as a client
async function getMySessions(req, res) {
    const sessions = await Session.find({ client: req.user._id })
        .sort({ scheduledAt: -1 })
        .limit(100)
        .populate(WITH_PROFESSIONAL);
    res.json(sessions);
}

// Sessions booked with the signed-in professional
async function getAssignedSessions(req, res) {
    const professional = await Professional.findOne({ user: req.user._id });
    if (!professional) return res.json([]);

    const sessions = await Session.find({ professional: professional._id })
        .select("+privateNotes")
        .sort({ scheduledAt: -1 })
        .limit(200)
        .populate("client", "fullName");
    res.json(sessions);
}

// Who may move a session from one status to another.
const TRANSITIONS = {
    client: { pending: ["cancelled"], confirmed: ["cancelled"] },
    professional: { pending: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"] },
};

async function findForParticipant(req, extraSelect = "") {
    const session = await Session.findById(req.params.id).select(extraSelect).populate("professional", "user");
    if (!session) throw ApiError.notFound("Session");

    const isClient = session.client.equals(req.user._id);
    const isProfessional = session.professional?.user.equals(req.user._id);
    // 404 rather than 403, so ids of other people's sessions cannot be probed.
    if (!isClient && !isProfessional) throw ApiError.notFound("Session");
    return { session, as: isProfessional ? "professional" : "client" };
}

async function updateStatus(req, res) {
    const { session, as } = await findForParticipant(req);
    const allowed = TRANSITIONS[as][session.status] || [];
    if (!allowed.includes(req.body.status)) {
        throw ApiError.badRequest(`A ${session.status} session cannot be marked ${req.body.status}`);
    }
    if (req.body.status === "completed" && session.scheduledAt > new Date()) {
        throw ApiError.badRequest("A session cannot be completed before it has started");
    }

    session.status = req.body.status;
    await session.save();
    res.json(session);
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

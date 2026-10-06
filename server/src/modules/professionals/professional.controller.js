import Professional from "./professional.model.js";
import Session from "../sessions/session.model.js";
import ApiError from "../../utils/ApiError.js";
import Review from "../reviews/review.model.js";
import { openSlots } from "./slots.js";
import { busyTimes } from "../google/google.service.js";

const PUBLIC_USER_FIELDS = "fullName";

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function takenTimes(professionalIds) {
    const sessions = await Session.find({
        professional: { $in: professionalIds },
        active: true,
        scheduledAt: { $gte: new Date() },
    }).select("professional scheduledAt");

    const byProfessional = new Map();
    for (const session of sessions) {
        const key = session.professional.toString();
        if (!byProfessional.has(key)) byProfessional.set(key, []);
        byProfessional.get(key).push(session.scheduledAt);
    }
    return byProfessional;
}

// Public directory. Only approved profiles are ever returned.
async function listProfessionals(req, res) {
    const { q, type, specialty, language, sort, page, limit } = req.filters;
    const filter = { status: "approved", type: type || { $in: ["therapist", "peer"] } };
    if (specialty) filter.specialties = specialty;
    if (language) filter.languages = language;

    let professionals = await Professional.find(filter)
        .select("-institution -institutionStatus -meetingLink -reviewNote")
        .populate("user", PUBLIC_USER_FIELDS)
        .lean();

    // Name lives on the user document, so free-text search runs after the join.
    // Fine for a directory of hundreds; move to a search index beyond that.
    if (q) {
        const pattern = new RegExp(escapeRegex(q), "i");
        professionals = professionals.filter((p) =>
            pattern.test(p.user?.fullName || "") ||
            pattern.test(p.location || "") ||
            p.specialties.some((s) => pattern.test(s))
        );
    }

    const taken = await takenTimes(professionals.map((p) => p._id));
    for (const professional of professionals) {
        const slots = openSlots(professional, taken.get(professional._id.toString()));
        professional.nextAvailable = slots[0] || null;
    }

    const sorters = {
        soonest: (a, b) => (a.nextAvailable?.getTime() ?? Infinity) - (b.nextAvailable?.getTime() ?? Infinity),
        price: (a, b) => a.rate.amount - b.rate.amount,
        experience: (a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0),
        rating: (a, b) => b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount,
    };
    professionals.sort(sorters[sort]);

    const start = (page - 1) * limit;
    res.json({
        items: professionals.slice(start, start + limit),
        total: professionals.length,
        page,
        pages: Math.max(1, Math.ceil(professionals.length / limit)),
    });
}

async function getProfessional(req, res) {
    const professional = await Professional.findOne({ _id: req.params.id, status: "approved", type: { $ne: "institution" } })
        .populate("user", PUBLIC_USER_FIELDS)
        .populate("institution", "organisationName status")
        .lean();
    if (!professional) throw ApiError.notFound("Professional");

    // Only show an institution the professional has actually joined
    if (professional.institutionStatus !== "active" || professional.institution?.status !== "approved") {
        delete professional.institution;
    }
    delete professional.institutionStatus;
    delete professional.meetingLink;
    delete professional.reviewNote;

    const [taken, busy] = await Promise.all([takenTimes([professional._id]), busyTimes(professional)]);
    professional.slots = openSlots(professional, taken.get(professional._id.toString()), new Date(), busy);
    professional.nextAvailable = professional.slots[0] || null;
    res.json(professional);
}

// Reviews are shown without names: people should be able to be honest about
// therapy without the world knowing they had it.
async function getReviews(req, res) {
    const reviews = await Review.find({ professional: req.params.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .select("rating comment createdAt");
    res.json(reviews);
}

// Lists of filter options for the directory, taken from what is actually on offer.
async function getFilters(req, res) {
    const [specialties, languages] = await Promise.all([
        Professional.distinct("specialties", { status: "approved" }),
        Professional.distinct("languages", { status: "approved" }),
    ]);
    res.json({ specialties: specialties.sort(), languages: languages.sort() });
}

async function getMyProfile(req, res) {
    const professional = await Professional.findOne({ user: req.user._id })
        .select("+licenseNumber")
        .populate("institution", "organisationName");
    res.json(professional);
}

// Creates the application, or updates it while it is waiting or was rejected.
async function apply(req, res) {
    let professional = await Professional.findOne({ user: req.user._id }).select("+licenseNumber");
    if (professional?.status === "approved") {
        throw ApiError.conflict("Your profile is already approved. Edit it from your dashboard");
    }

    if (!professional) professional = new Professional({ user: req.user._id });
    Object.assign(professional, req.body, { status: "pending", reviewNote: undefined });
    await professional.save();

    if (req.user.accountType !== "professional") {
        req.user.accountType = "professional";
        await req.user.save();
    }
    res.status(201).json(professional);
}

// Accept an institution's invitation, or (accept: false) decline it or leave.
async function answerInvitation(req, res) {
    const professional = await Professional.findOne({ user: req.user._id });
    if (!professional?.institution) throw ApiError.notFound("Invitation");

    if (req.body.accept) {
        professional.institutionStatus = "active";
    } else {
        professional.institution = undefined;
        professional.institutionStatus = undefined;
    }
    await professional.save();
    res.json(await professional.populate("institution", "organisationName"));
}

async function updateMyProfile(req, res) {
    const professional = await Professional.findOne({ user: req.user._id });
    if (!professional) throw ApiError.notFound("Profile");
    Object.assign(professional, req.body);
    await professional.save();
    res.json(professional);
}

export default {
    listProfessionals,
    getProfessional,
    getReviews,
    answerInvitation,
    getFilters,
    getMyProfile,
    apply,
    updateMyProfile
}

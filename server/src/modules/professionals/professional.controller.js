import Professional from "./professional.model.js";
import Session from "../sessions/session.model.js";
import ApiError from "../../utils/ApiError.js";
import { openSlots } from "./slots.js";

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

    let professionals = await Professional.find(filter).populate("user", PUBLIC_USER_FIELDS).lean();

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
    const professional = await Professional.findOne({ _id: req.params.id, status: "approved" })
        .populate("user", PUBLIC_USER_FIELDS)
        .lean();
    if (!professional) throw ApiError.notFound("Professional");

    const taken = await takenTimes([professional._id]);
    professional.slots = openSlots(professional, taken.get(professional._id.toString()));
    professional.nextAvailable = professional.slots[0] || null;
    res.json(professional);
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
    const professional = await Professional.findOne({ user: req.user._id }).select("+licenseNumber");
    res.json(professional);
}

// Creates the application, or updates it while it is waiting or was rejected.
async function apply(req, res) {
    let professional = await Professional.findOne({ user: req.user._id }).select("+licenseNumber");
    if (professional?.status === "approved") {
        throw ApiError.conflict("Your profile is already approved. Edit it from your dashboard");
    }
    if (req.body.type === "therapist" && !req.body.licenseNumber) {
        throw ApiError.badRequest("Enter your licence number so we can verify it");
    }

    if (!professional) professional = new Professional({ user: req.user._id });
    Object.assign(professional, req.body, { status: "pending", reviewNote: undefined });
    await professional.save();
    res.status(201).json(professional);
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
    getFilters,
    getMyProfile,
    apply,
    updateMyProfile
}

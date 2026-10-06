import Nugget from "./nugget.model.js";
import User from "../users/user.model.js";
import ApiError from "../../utils/ApiError.js";

const isAdmin = (user) => user?.role === "admin";

// Public feed. Everyone sees published nuggets; admins can ask for other statuses.
async function getNuggets(req, res) {
    const { topic, status, page, limit } = req.filters;
    const filter = { status: isAdmin(req.user) && status ? status : "published" };
    if (topic) filter.topic = topic;

    const [items, total] = await Promise.all([
        Nugget.find(filter)
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("author", "fullName"),
        Nugget.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

// The same nugget for everyone on a given day, moving through the list daily.
async function getTodaysNugget(req, res) {
    const total = await Nugget.countDocuments({ status: "published" });
    if (!total) return res.json(null);

    const dayNumber = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const nugget = await Nugget.findOne({ status: "published" }).sort({ _id: 1 }).skip(dayNumber % total);
    res.json(nugget);
}

async function getNugget(req, res) {
    const nugget = await Nugget.findById(req.params.id).populate("author", "fullName");
    if (!nugget || (nugget.status !== "published" && !isAdmin(req.user))) throw ApiError.notFound("Nugget");
    res.json(nugget);
}

async function createNugget(req, res) {
    const publish = isAdmin(req.user) && req.body.status === "published";
    const nugget = await Nugget.create({
        ...req.body,
        author: req.user._id,
        // Whatever a non-admin sends, their nugget waits for review.
        status: isAdmin(req.user) ? req.body.status || "draft" : "review",
        publishedAt: publish ? new Date() : undefined,
    });
    res.status(201).json(nugget);
}

async function updateNugget(req, res) {
    const nugget = await Nugget.findById(req.params.id);
    if (!nugget) throw ApiError.notFound("Nugget");

    Object.assign(nugget, req.body);
    if (nugget.status === "published" && !nugget.publishedAt) nugget.publishedAt = new Date();
    await nugget.save();
    res.json(nugget);
}

async function deleteNugget(req, res) {
    const deleted = await Nugget.findByIdAndDelete(req.params.id);
    if (!deleted) throw ApiError.notFound("Nugget");
    res.json({ message: "Deleted" });
}

async function getSavedNuggets(req, res) {
    const user = await User.findById(req.user._id).populate({ path: "savedNuggets", match: { status: "published" } });
    res.json(user.savedNuggets);
}

async function saveNugget(req, res) {
    const exists = await Nugget.exists({ _id: req.params.id, status: "published" });
    if (!exists) throw ApiError.notFound("Nugget");
    await User.updateOne({ _id: req.user._id }, { $addToSet: { savedNuggets: req.params.id } });
    res.json({ saved: true });
}

async function unsaveNugget(req, res) {
    await User.updateOne({ _id: req.user._id }, { $pull: { savedNuggets: req.params.id } });
    res.json({ saved: false });
}

export default {
    getNuggets,
    getTodaysNugget,
    getNugget,
    createNugget,
    updateNugget,
    deleteNugget,
    getSavedNuggets,
    saveNugget,
    unsaveNugget
}

import Event from "./event.model.js";
import ApiError from "../../utils/ApiError.js";

// What anyone may see. The participant list is private, so it is reduced to a
// count plus whether the person asking is on it.
function present(event, user) {
    const joined = !!user && event.participants.some((p) => p.equals(user._id));
    const isHost = !!user && (user.role === "admin" || event.host?.equals(user._id));
    const { participants, joinLink, __v, ...rest } = event.toObject();
    return {
        ...rest,
        participantCount: participants.length,
        isFull: !!event.capacity && participants.length >= event.capacity,
        joined,
        joinLink: joined || isHost ? joinLink : undefined,
    };
}

function canManage(event, user) {
    return user.role === "admin" || event.host?.equals(user._id);
}

// Get all events (Public)
async function getEvents(req, res) {
    const filter = req.filters.when === "past"
        ? { eventDate: { $lt: new Date() } }
        : { eventDate: { $gte: new Date() } };
    const events = await Event.find(filter)
        .sort({ eventDate: req.filters.when === "past" ? -1 : 1 })
        .limit(50);
    res.json(events.map((event) => present(event, req.user)));
}

//Get event by ID
async function getEvent(req, res) {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound("Event");
    res.json(present(event, req.user));
}

//Create event (therapist, peer counsellor or admin)
async function createEvent(req, res) {
    const event = await Event.create({ ...req.body, host: req.user._id });
    res.status(201).json(present(event, req.user));
}

//Update event (its host or an admin)
async function updateEvent(req, res) {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound("Event");
    if (!canManage(event, req.user)) throw ApiError.forbidden();

    Object.assign(event, req.body);
    await event.save();
    res.json(present(event, req.user));
}

async function deleteEvent(req, res) {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound("Event");
    if (!canManage(event, req.user)) throw ApiError.forbidden();

    await event.deleteOne();
    res.json({ message: "Deleted" });
}

// Join event
async function joinEvent(req, res) {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound("Event");
    if (event.eventDate < new Date()) throw ApiError.badRequest("This event has already happened");

    // One atomic update, so two people cannot take the last seat at once and
    // nobody is added twice.
    const filter = { _id: event._id, participants: { $ne: req.user._id } };
    if (event.capacity) filter[`participants.${event.capacity - 1}`] = { $exists: false };

    const updated = await Event.findOneAndUpdate(
        filter,
        { $addToSet: { participants: req.user._id } },
        { returnDocument: "after" }
    );
    if (!updated) {
        const alreadyParticipant = event.participants.some((p) => p.equals(req.user._id));
        if (alreadyParticipant) return res.json(present(event, req.user));
        throw ApiError.conflict("This event is full");
    }
    res.json(present(updated, req.user));
}

async function leaveEvent(req, res) {
    const updated = await Event.findByIdAndUpdate(
        req.params.id,
        { $pull: { participants: req.user._id } },
        { returnDocument: "after" }
    );
    if (!updated) throw ApiError.notFound("Event");
    res.json(present(updated, req.user));
}

export default {
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    getEvent,
    joinEvent,
    leaveEvent
}

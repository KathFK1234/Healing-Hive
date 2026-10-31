import Event from "./event.model.js";
import User from "../users/user.model.js";
import ApiError from "../../utils/ApiError.js";
import env from "../../config/env.js";
import { sendMail } from "../../utils/mailer.js";
import { when } from "../sessions/session.controller.js";

// What anyone may see. The participant list is private, so it is reduced to a
// count plus whether the person asking is on it, and the host's account id is
// reduced to whether the person asking may edit or delete it.
function present(event, user) {
    const joined = !!user && event.participants.some((p) => p.equals(user._id));
    const isHost = !!user && canManage(event, user);
    const { participants, joinLink, host, __v, ...rest } = event.toObject();
    return {
        ...rest,
        participantCount: participants.length,
        isFull: !!event.capacity && participants.length >= event.capacity,
        joined,
        canManage: isHost,
        joinLink: joined || isHost ? joinLink : undefined,
    };
}

// An event stays upcoming until it has ended, not just started, so people
// arriving late still find it (and its join link) under Upcoming.
const MAX_DURATION_MS = 600 * 60 * 1000;
const endsAt = (event) => new Date(event.eventDate.getTime() + (event.durationMinutes || 60) * 60 * 1000);

function upcomingFilter(now, upcoming) {
    const end = { $add: ["$eventDate", { $multiply: [{ $ifNull: ["$durationMinutes", 60] }, 60 * 1000] }] };
    return upcoming
        // The date bound keeps the eventDate index useful; the $expr is exact
        ? { eventDate: { $gte: new Date(now.getTime() - MAX_DURATION_MS) }, $expr: { $gt: [end, now] } }
        : { eventDate: { $lt: now }, $expr: { $lte: [end, now] } };
}

function canManage(event, user) {
    return user.role === "admin" || event.host?.equals(user._id);
}

// Get all events (Public)
async function getEvents(req, res) {
    const events = await Event.find(upcomingFilter(new Date(), req.filters.when !== "past"))
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

function refusePastDate(eventDate) {
    if (eventDate && eventDate <= new Date()) {
        throw ApiError.badRequest("Pick a date and time that hasn't passed yet", [{ field: "eventDate", message: "This time has already passed" }]);
    }
}

//Create event (therapist, peer counsellor or admin)
async function createEvent(req, res) {
    refusePastDate(req.body.eventDate);
    const event = await Event.create({ ...req.body, host: req.user._id });
    res.status(201).json(present(event, req.user));
}

//Update event (its host or an admin)
async function updateEvent(req, res) {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound("Event");
    if (!canManage(event, req.user)) throw ApiError.forbidden();
    // The edit form sends the date even when it is unchanged, and the host of
    // an event under way must still be able to fix its join link.
    const moved = !!req.body.eventDate && req.body.eventDate.getTime() !== event.eventDate.getTime();
    if (moved) refusePastDate(req.body.eventDate);

    Object.assign(event, req.body);
    await event.save();

    // One email each, so nobody learns who else is going
    if (moved) {
        const people = await User.find({ _id: { $in: event.participants, $ne: req.user._id } }).select("fullName email");
        await Promise.all(people.map((person) => sendMail({
            to: person.email,
            subject: "A Healing Hive event has moved",
            text: `Hello ${person.fullName},\n\n"${event.title}" is now on ${when(event.eventDate)}.\n\nIf that no longer suits you, you can cancel your place here:\n${env.clientUrl}/events`,
        })));
    }
    res.json(present(event, req.user));
}

async function deleteEvent(req, res) {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound("Event");
    if (!canManage(event, req.user)) throw ApiError.forbidden();

    await event.deleteOne();

    // Tell everyone who registered, like a cancelled session, and the host if
    // someone else (an admin) removed it. One email each, so nobody learns who
    // else was going.
    if (endsAt(event) > new Date()) {
        const started = event.eventDate <= new Date();
        const removedByOther = event.host && !event.host.equals(req.user._id);
        const people = await User.find({ _id: { $in: event.participants, $ne: req.user._id } }).select("fullName email");
        const mails = people
            .filter((person) => !(removedByOther && person._id.equals(event.host)))
            .map((person) => ({
                to: person.email,
                subject: "A Healing Hive event was cancelled",
                text: `Hello ${person.fullName},\n\n"${event.title}" on ${when(event.eventDate)} ${started ? "has been ended early" : "has been cancelled"}.\n\nOther events are listed here:\n${env.clientUrl}/events`,
            }));
        const host = removedByOther && await User.findById(event.host).select("fullName email");
        if (host) {
            mails.push({
                to: host.email,
                subject: "Your Healing Hive event was removed",
                text: `Hello ${host.fullName},\n\nYour event "${event.title}" on ${when(event.eventDate)} was removed by the Healing Hive team.${mails.length ? " The people who registered have been told." : ""}`,
            });
        }
        await Promise.all(mails.map(sendMail));
    }
    res.json({ message: "Deleted" });
}

// Join event
async function joinEvent(req, res) {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound("Event");
    if (endsAt(event) <= new Date()) throw ApiError.badRequest("This event has already happened");

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

import crypto from "node:crypto";
import { createMeetEvent, deleteEvent } from "../google/google.service.js";

// Decides where a confirmed session happens. In order:
//   1. a Google Meet created in the professional's calendar (if they connected it)
//   2. the professional's own standing meeting link (if they set one)
//   3. a private Jitsi room. Free and needs no setup, but Jitsi asks whoever
//      opens the room first to sign in with a Google or GitHub account.
export async function arrangeMeeting({ session, professional, clientEmail, professionalName }) {
    try {
        const meet = await createMeetEvent({ professional, session, clientEmail, professionalName });
        if (meet?.meetingUrl) return meet;
    } catch (err) {
        // A Google outage must not stop a session being confirmed.
        console.error(err.message);
    }

    if (professional.meetingLink) return { meetingUrl: professional.meetingLink };

    // The room name is the only thing protecting the room, so it has to be unguessable.
    return { meetingUrl: `https://meet.jit.si/HealingHive-${crypto.randomBytes(16).toString("hex")}` };
}

export async function cancelMeeting(session) {
    if (session.googleEventId) await deleteEvent(session.professional._id ?? session.professional, session.googleEventId);
}

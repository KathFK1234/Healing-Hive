import { Video, Phone, MessageSquare } from 'lucide-react';

export const SESSION_STATUS = {
  pending: { label: 'Waiting for confirmation', tone: 'honey' },
  confirmed: { label: 'Confirmed', tone: 'primary' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  // A request nobody answered before its time came. Still `pending` on the
  // server, but it can no longer happen.
  expired: { label: 'Not confirmed in time', tone: 'neutral' },
};

export const MODE_ICON = { video: Video, audio: Phone, chat: MessageSquare };
export const MODE_LABEL = { video: 'Video call', audio: 'Voice call', chat: 'Text chat' };

// Still ahead of us and not cancelled.
export const isUpcoming = (session) =>
  (session.status === 'pending' || session.status === 'confirmed') && new Date(session.scheduledAt) > new Date();

// A confirmed session with a link, from 15 minutes before it starts until it
// would have ended (the join button is not shown days ahead, to avoid people
// wandering into an empty room).
export function canJoin(session) {
  if (session.status !== 'confirmed' || !session.meetingUrl) return false;
  const start = new Date(session.scheduledAt).getTime();
  const end = start + (session.durationMinutes || 60) * 60 * 1000;
  return Date.now() >= start - 15 * 60 * 1000 && Date.now() <= end;
}

// Confirmed and not finished yet (unlike isUpcoming, this is still true while
// the session is under way).
export function isLive(session) {
  if (session.status !== 'confirmed') return false;
  const end = new Date(session.scheduledAt).getTime() + (session.durationMinutes || 60) * 60 * 1000;
  return Date.now() <= end;
}

// Not finished yet: still to come, or confirmed and under way. Used wherever a
// session should stay on screen (with its Join button) until it has ended.
export const isCurrent = (session) => isUpcoming(session) || isLive(session);

// The status to show: a request whose time has passed reads as expired.
export const displayStatus = (session) =>
  session.status === 'pending' && !isUpcoming(session) ? 'expired' : session.status;

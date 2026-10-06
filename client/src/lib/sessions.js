import { Video, Phone, MessageSquare } from 'lucide-react';

export const SESSION_STATUS = {
  pending: { label: 'Waiting for confirmation', tone: 'honey' },
  confirmed: { label: 'Confirmed', tone: 'primary' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
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

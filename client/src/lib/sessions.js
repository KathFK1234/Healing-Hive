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

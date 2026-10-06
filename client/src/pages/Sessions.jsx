import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Video } from 'lucide-react';
import { SESSION_STATUS, MODE_ICON, MODE_LABEL, isUpcoming } from '@/lib/sessions';
import { api } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Avatar, Badge, Button, Card, Chip, EmptyState, FormError, Modal, PageHeader, QueryState, useToast } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

const Sessions = () => {
  usePageTitle('My sessions');
  const [tab, setTab] = useState('upcoming');
  const [cancelling, setCancelling] = useState(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['sessions', 'mine'], queryFn: () => api.get('/sessions/mine') });

  const cancel = useMutation({
    mutationFn: (session) => api.patch(`/sessions/${session._id}/status`, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setCancelling(null);
      toast('Session cancelled');
    },
  });

  return (
    <>
      <PageHeader
        title="My sessions"
        description="Your booked time with therapists and peer counsellors."
        action={<Button to="/therapists">Book a session</Button>}
      />

      <div className="mb-4 flex gap-2" role="group" aria-label="Which sessions to show">
        <Chip selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming</Chip>
        <Chip selected={tab === 'past'} onClick={() => setTab('past')}>Past and cancelled</Chip>
      </div>

      <QueryState query={query}>
        {(sessions) => {
          const upcoming = sessions.filter(isUpcoming).reverse();
          const shown = tab === 'upcoming' ? upcoming : sessions.filter((session) => !isUpcoming(session));
          if (shown.length === 0) {
            return tab === 'upcoming' ? (
              <EmptyState icon={CalendarDays} title="Nothing booked yet" action={<Button to="/therapists">Find support</Button>}>
                When you book a session it will show here, with everything you need to join.
              </EmptyState>
            ) : (
              <EmptyState icon={CalendarDays} title="No past sessions" />
            );
          }
          return (
            <ul className="space-y-3">
              {shown.map((session) => (
                <li key={session._id}>
                  <SessionCard
                    session={session}
                    name={session.professional?.user?.fullName || 'Professional'}
                    subtitle={session.professional?.title}
                    actions={isUpcoming(session) && <Button variant="outline" size="sm" onClick={() => { cancel.reset(); setCancelling(session); }}>Cancel</Button>}
                  />
                </li>
              ))}
            </ul>
          );
        }}
      </QueryState>

      <Modal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this session?"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep it</Button>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate(cancelling)}>Cancel session</Button>
          </>
        }
      >
        {cancelling && (
          <div className="space-y-3">
            <p>
              Your session with <strong>{cancelling.professional?.user?.fullName}</strong> on{' '}
              <strong>{formatDateTime(cancelling.scheduledAt)}</strong> will be cancelled and the time freed for someone else.
            </p>
            <FormError error={cancel.error} />
          </div>
        )}
      </Modal>
    </>
  );
};

// Shared with the professional's practice page.
export function SessionCard({ session, name, subtitle, actions, children }) {
  const status = SESSION_STATUS[session.status];
  const ModeIcon = MODE_ICON[session.mode] || Video;
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base">{name}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          <p className="mt-1 font-bold">{formatDateTime(session.scheduledAt)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ModeIcon className="h-4 w-4" aria-hidden="true" /> {MODE_LABEL[session.mode]}</span>
            <span>{session.durationMinutes} min</span>
            <span>{formatMoney(session.price?.amount, session.price?.currency)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {actions}
        </div>
      </div>
      {children}
    </Card>
  );
}

export default Sessions;

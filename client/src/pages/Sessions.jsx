import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Video } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { SESSION_STATUS, MODE_ICON, MODE_LABEL, isUpcoming, isLive, canJoin } from '@/lib/sessions';
import { Avatar, Badge, Button, Card, Chip, EmptyState, Field, FormError, Modal, PageHeader, QueryState, Textarea, useToast } from '@/components/ui';
import { Stars } from '@/components/Stars';
import { usePageTitle } from '@/hooks/usePageTitle';

const Sessions = () => {
  usePageTitle('My sessions');
  const [tab, setTab] = useState('upcoming');
  const [cancelling, setCancelling] = useState(null);
  const [rating, setRating] = useState(null);
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

  const review = useMutation({
    mutationFn: () => api.put('/reviews', { sessionId: rating.session._id, rating: rating.stars, comment: rating.comment || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['professional'] });
      setRating(null);
      toast('Thank you for your feedback');
    },
  });

  const openRating = (session) => {
    review.reset();
    setRating({ session, stars: session.review?.rating || 0, comment: session.review?.comment || '' });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="My sessions"
        description="Your booked time with therapists and peer counsellors."
        action={<Button to="/therapists">Book a session</Button>}
      />

      <div className="mb-6 flex gap-2" role="group" aria-label="Which sessions to show">
        <Chip selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming</Chip>
        <Chip selected={tab === 'past'} onClick={() => setTab('past')}>Past</Chip>
      </div>

      <QueryState query={query}>
        {(sessions) => {
          // "Upcoming" keeps a session until it has finished, so the Join
          // button does not vanish the moment the start time passes.
          const current = (session) => isUpcoming(session) || isLive(session);
          const shown = tab === 'upcoming' ? sessions.filter(current).reverse() : sessions.filter((session) => !current(session));
          if (shown.length === 0) {
            return tab === 'upcoming' ? (
              <EmptyState icon={CalendarDays} title="Nothing booked yet" action={<Button to="/therapists">Find support</Button>}>
                When you book a session it will show here, with a link to join when it's time.
              </EmptyState>
            ) : (
              <EmptyState icon={CalendarDays} title="No past sessions" />
            );
          }
          return (
            <ul className="space-y-5">
              {shown.map((session) => (
                <li key={session._id}>
                  <SessionCard session={session} name={session.professional?.user?.fullName || 'Professional'} subtitle={session.professional?.title}>
                    <SessionActions>
                      <JoinButton session={session} />
                      {session.status === 'confirmed' && !canJoin(session) && isUpcoming(session) && (
                        <p className="text-muted-foreground">The link to join appears here 15 minutes before you start.</p>
                      )}
                      {isUpcoming(session) && (
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { cancel.reset(); setCancelling(session); }}>Cancel session</Button>
                      )}
                      {session.status === 'completed' && (
                        session.review ? (
                          <button type="button" onClick={() => openRating(session)} className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
                            You rated this <Stars value={session.review.rating} /> <span className="text-primary">Change</span>
                          </button>
                        ) : (
                          <Button variant="soft" size="sm" onClick={() => openRating(session)}>How was it? Leave a rating</Button>
                        )
                      )}
                    </SessionActions>
                  </SessionCard>
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
          <div className="space-y-4">
            <p>
              Your session with <strong>{cancelling.professional?.user?.fullName}</strong> on{' '}
              <strong>{formatDateTime(cancelling.scheduledAt)}</strong> will be cancelled and the time freed for someone else. We'll let them know.
            </p>
            <FormError error={cancel.error} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!rating}
        onClose={() => setRating(null)}
        title="How was your session?"
        footer={
          <>
            <Button variant="outline" onClick={() => setRating(null)}>Not now</Button>
            <Button loading={review.isPending} disabled={!rating?.stars} onClick={() => review.mutate()}>Send rating</Button>
          </>
        }
      >
        {rating && (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Your rating of {rating.session.professional?.user?.fullName} helps other people choose. It is shown without your name.
            </p>
            <div className="text-center">
              <Stars size="lg" value={rating.stars} onChange={(stars) => setRating({ ...rating, stars })} />
            </div>
            <Field label="Anything you'd like to add? (optional)" hint="Please don't include anything that identifies you.">
              {(field) => <Textarea {...field} rows={3} maxLength={1000} value={rating.comment} onChange={(event) => setRating({ ...rating, comment: event.target.value })} />}
            </Field>
            <FormError error={review.error} />
          </div>
        )}
      </Modal>
    </div>
  );
};

// The link to the call, shown from 15 minutes before the session.
export function JoinButton({ session }) {
  if (!canJoin(session)) return null;
  return (
    <a
      href={session.meetingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
    >
      <Video className="h-5 w-5" aria-hidden="true" /> Join session
    </a>
  );
}

export function SessionActions({ children }) {
  return <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6 empty:hidden">{children}</div>;
}

// Shared with the professional's practice page.
export function SessionCard({ session, name, subtitle, children }) {
  const status = SESSION_STATUS[session.status];
  const ModeIcon = MODE_ICON[session.mode] || Video;
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{formatDateTime(session.scheduledAt)}</p>
          <p className="mt-1">with <span className="font-semibold">{name}</span>{subtitle ? `, ${subtitle}` : ''}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ModeIcon className="h-4 w-4" aria-hidden="true" /> {MODE_LABEL[session.mode]}</span>
            <span>{session.durationMinutes} minutes</span>
            <span>{formatMoney(session.price?.amount, session.price?.currency)}</span>
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {children}
    </Card>
  );
}

export default Sessions;

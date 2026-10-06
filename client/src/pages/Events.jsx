import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, ExternalLink, Mic, Plus, Ticket, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatLongDate, formatMoney, formatTime } from '@/lib/format';
import { Badge, Button, Card, Chip, EmptyState, Field, FormError, Input, Modal, PageHeader, QueryState, Textarea, useToast } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

const blank = { title: '', description: '', speaker: '', date: '', time: '18:00', durationMinutes: 60, price: 0, capacity: '', joinLink: '' };

const Events = () => {
  usePageTitle('Events');
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [when, setWhen] = useState('upcoming');
  const [draft, setDraft] = useState(null);
  const canHost = ['therapist', 'peer', 'admin'].includes(user?.role);

  const query = useQuery({ queryKey: ['events', when, !!user], queryFn: () => api.get('/events', { when }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['events'] });
  const onError = (error) => toast(error.message, 'error');

  const join = useMutation({
    mutationFn: (event) => event.joined ? api.delete(`/events/${event._id}/join`) : api.post(`/events/${event._id}/join`),
    onSuccess: (event) => {
      refresh();
      toast(event.joined ? "You're registered" : 'Registration cancelled');
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (event) => api.delete(`/events/${event._id}`),
    onSuccess: () => {
      refresh();
      toast('Event deleted');
    },
    onError,
  });

  const create = useMutation({
    mutationFn: () => api.post('/events', {
      title: draft.title,
      description: draft.description || undefined,
      speaker: draft.speaker || undefined,
      // The form asks for East Africa Time, which is always UTC+3
      eventDate: `${draft.date}T${draft.time}:00+03:00`,
      durationMinutes: Number(draft.durationMinutes),
      price: Number(draft.price) || 0,
      capacity: draft.capacity ? Number(draft.capacity) : undefined,
      joinLink: draft.joinLink || undefined,
    }),
    onSuccess: () => {
      refresh();
      setDraft(null);
      toast('Event created');
    },
  });

  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value });

  return (
    <>
      <PageHeader
        title="Wellness events"
        description="Guided group sessions and talks, led by our therapists and peer counsellors."
        action={canHost && <Button onClick={() => { create.reset(); setDraft(blank); }}><Plus className="h-4 w-4" aria-hidden="true" /> New event</Button>}
      />

      <div className="mb-4 flex gap-2" role="group" aria-label="Which events to show">
        <Chip selected={when === 'upcoming'} onClick={() => setWhen('upcoming')}>Upcoming</Chip>
        <Chip selected={when === 'past'} onClick={() => setWhen('past')}>Past</Chip>
      </div>

      <QueryState query={query}>
        {(events) => events.length === 0 ? (
          <EmptyState icon={Ticket} title={when === 'upcoming' ? 'No events planned right now' : 'No past events'}>
            {when === 'upcoming' && 'New sessions are added regularly. Check back soon.'}
          </EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {events.map((event) => {
              const canManage = user && (user.role === 'admin' || event.host === user._id);
              return (
                <li key={event._id}>
                  <Card as="article" className="flex h-full flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Badge tone={event.price ? 'calm' : 'primary'}>{formatMoney(event.price)}</Badge>
                      {event.joined && <Badge tone="honey">You're going</Badge>}
                    </div>
                    <h2 className="mt-3 text-lg">{event.title}</h2>
                    {event.description && <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{event.description}</p>}
                    <ul className="mt-4 space-y-1.5 text-sm">
                      <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {formatLongDate(event.eventDate)}</li>
                      <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {formatTime(event.eventDate)} EAT · {event.durationMinutes} min</li>
                      {event.speaker && <li className="flex items-center gap-2"><Mic className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {event.speaker}</li>}
                      <li className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {event.participantCount} going{event.capacity ? ` · ${Math.max(0, event.capacity - event.participantCount)} places left` : ''}
                      </li>
                    </ul>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                      {when === 'upcoming' && (
                        !user ? <Button to="/login" state={{ from: location.pathname }} size="sm">Sign in to register</Button>
                          : event.joined ? <Button variant="outline" size="sm" onClick={() => join.mutate(event)}>Cancel registration</Button>
                            : event.isFull ? <Badge>Fully booked</Badge>
                              : <Button size="sm" onClick={() => join.mutate(event)}>Register</Button>
                      )}
                      {event.joinLink && (
                        <a href={event.joinLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary-soft px-3 text-sm font-semibold text-primary hover:bg-primary-soft/70">
                          Open join link <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                      {canManage && (
                        <button type="button" onClick={() => { if (window.confirm(`Delete "${event.title}"? People who registered will no longer see it.`)) remove.mutate(event); }} aria-label={`Delete ${event.title}`} className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-danger">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {event.price > 0 && when === 'upcoming' && (
                      <p className="mt-2 text-xs text-muted-foreground">Online payment is not available yet. The host will share payment details with people who register.</p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="New event"
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button type="submit" form="event-form" loading={create.isPending}>Create event</Button>
          </>
        }
      >
        {draft && (
          <form id="event-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
            <FormError error={create.error} />
            <Field label="Title">{(field) => <Input {...field} required minLength={3} maxLength={120} value={draft.title} onChange={set('title')} />}</Field>
            <Field label="What is it about?">{(field) => <Textarea {...field} rows={3} maxLength={2000} value={draft.description} onChange={set('description')} />}</Field>
            <Field label="Speaker or host name">{(field) => <Input {...field} maxLength={80} value={draft.speaker} onChange={set('speaker')} />}</Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">{(field) => <Input {...field} type="date" required value={draft.date} onChange={set('date')} />}</Field>
              <Field label="Time (EAT)">{(field) => <Input {...field} type="time" required value={draft.time} onChange={set('time')} />}</Field>
              <Field label="Length (minutes)">{(field) => <Input {...field} type="number" min={10} max={600} required value={draft.durationMinutes} onChange={set('durationMinutes')} />}</Field>
              <Field label="Price (KSh)" hint="0 for free">{(field) => <Input {...field} type="number" min={0} value={draft.price} onChange={set('price')} />}</Field>
            </div>
            <Field label="Places available" hint="Leave empty for no limit">{(field) => <Input {...field} type="number" min={1} value={draft.capacity} onChange={set('capacity')} />}</Field>
            <Field label="Join link" hint="Only shown to people who register">{(field) => <Input {...field} type="url" placeholder="https://" value={draft.joinLink} onChange={set('joinLink')} />}</Field>
          </form>
        )}
      </Modal>
    </>
  );
};

export default Events;

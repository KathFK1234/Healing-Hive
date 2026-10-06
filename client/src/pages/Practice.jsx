import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ExternalLink, Inbox, NotebookPen } from 'lucide-react';
import { api } from '@/lib/api';
import { isUpcoming } from '@/lib/sessions';
import { Button, Card, Chip, EmptyState, Field, FormError, Modal, PageHeader, QueryState, Section, Textarea, useToast } from '@/components/ui';
import { ProfessionalForm } from '@/components/ProfessionalForm';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SessionCard } from './Sessions';

const Practice = () => {
  usePageTitle('My practice');
  const [tab, setTab] = useState('sessions');
  const profile = useQuery({ queryKey: ['professionals', 'me'], queryFn: () => api.get('/professionals/me') });

  return (
    <>
      <PageHeader
        title="My practice"
        description="Requests, upcoming sessions and how you appear to people looking for support."
        action={profile.data && (
          <Button to={`/therapists/${profile.data._id}`} variant="outline">View public profile <ExternalLink className="h-4 w-4" aria-hidden="true" /></Button>
        )}
      />

      <div className="mb-6 flex gap-2" role="group" aria-label="Section">
        <Chip selected={tab === 'sessions'} onClick={() => setTab('sessions')}>Sessions</Chip>
        <Chip selected={tab === 'profile'} onClick={() => setTab('profile')}>Profile and hours</Chip>
      </div>

      {tab === 'sessions' ? <AssignedSessions /> : <QueryState query={profile}>{(data) => <EditProfile profile={data} />}</QueryState>}
    </>
  );
};

function AssignedSessions() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [notesFor, setNotesFor] = useState(null);
  const [notes, setNotes] = useState('');

  const query = useQuery({ queryKey: ['sessions', 'assigned'], queryFn: () => api.get('/sessions/assigned') });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sessions'] });

  const setStatus = useMutation({
    mutationFn: ({ session, status }) => api.patch(`/sessions/${session._id}/status`, { status }),
    onSuccess: (_, { status }) => {
      refresh();
      toast({ confirmed: 'Session confirmed', cancelled: 'Session cancelled', completed: 'Marked as completed' }[status]);
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const saveNotes = useMutation({
    mutationFn: () => api.put(`/sessions/${notesFor._id}/notes`, { privateNotes: notes }),
    onSuccess: () => {
      refresh();
      setNotesFor(null);
      toast('Notes saved');
    },
  });

  const openNotes = (session) => {
    saveNotes.reset();
    setNotes(session.privateNotes || '');
    setNotesFor(session);
  };

  const notesButton = (session) => (
    <Button variant="ghost" size="sm" onClick={() => openNotes(session)}>
      <NotebookPen className="h-4 w-4" aria-hidden="true" /> {session.privateNotes ? 'Edit notes' : 'Add notes'}
    </Button>
  );

  const renderSession = (session, actions) => (
    <li key={session._id}>
      <SessionCard session={session} name={session.client?.fullName || 'Client'} actions={actions}>
        {session.clientNote && (
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm"><span className="font-bold">From the client: </span>{session.clientNote}</p>
        )}
      </SessionCard>
    </li>
  );

  return (
    <>
      <QueryState query={query}>
        {(sessions) => {
          const requests = sessions.filter((session) => session.status === 'pending' && isUpcoming(session)).reverse();
          const upcoming = sessions.filter((session) => session.status === 'confirmed' && isUpcoming(session)).reverse();
          // Confirmed sessions whose time has passed still need to be closed off
          const toWrapUp = sessions.filter((session) => session.status === 'confirmed' && !isUpcoming(session));
          const past = sessions.filter((session) => session.status === 'completed').slice(0, 20);

          if (sessions.length === 0) {
            return (
              <EmptyState icon={Inbox} title="No bookings yet">
                When someone books one of your open times it will show here for you to confirm. Make sure your weekly hours are set under "Profile and hours".
              </EmptyState>
            );
          }

          return (
            <div className="space-y-8">
              <Section title={`Requests waiting for you (${requests.length})`} icon={Inbox}>
                {requests.length === 0 ? <p className="text-sm text-muted-foreground">You're all caught up.</p> : (
                  <ul className="space-y-3">
                    {requests.map((session) => renderSession(session, (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setStatus.mutate({ session, status: 'cancelled' })}>Decline</Button>
                        <Button size="sm" onClick={() => setStatus.mutate({ session, status: 'confirmed' })}>Accept</Button>
                      </div>
                    )))}
                  </ul>
                )}
              </Section>

              {toWrapUp.length > 0 && (
                <Section title="Finished? Mark them completed">
                  <ul className="space-y-3">
                    {toWrapUp.map((session) => renderSession(session, (
                      <div className="flex gap-2">
                        {notesButton(session)}
                        <Button size="sm" onClick={() => setStatus.mutate({ session, status: 'completed' })}>Mark completed</Button>
                      </div>
                    )))}
                  </ul>
                </Section>
              )}

              <Section title="Upcoming" icon={CalendarDays}>
                {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No confirmed sessions coming up.</p> : (
                  <ul className="space-y-3">
                    {upcoming.map((session) => renderSession(session, (
                      <div className="flex gap-2">
                        {notesButton(session)}
                        <Button variant="outline" size="sm" onClick={() => { if (window.confirm('Cancel this confirmed session? The client will see it as cancelled.')) setStatus.mutate({ session, status: 'cancelled' }); }}>Cancel</Button>
                      </div>
                    )))}
                  </ul>
                )}
              </Section>

              {past.length > 0 && (
                <Section title="Completed">
                  <ul className="space-y-3">{past.map((session) => renderSession(session, notesButton(session)))}</ul>
                </Section>
              )}
            </div>
          );
        }}
      </QueryState>

      <Modal
        open={!!notesFor}
        onClose={() => setNotesFor(null)}
        title={`Private notes: ${notesFor?.client?.fullName || ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setNotesFor(null)}>Cancel</Button>
            <Button loading={saveNotes.isPending} onClick={() => saveNotes.mutate()}>Save notes</Button>
          </>
        }
      >
        <FormError error={saveNotes.error} />
        <Field label="Session notes" hint="Only you can see these. The client never does.">
          {(field) => <Textarea {...field} rows={8} maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} />}
        </Field>
      </Modal>
    </>
  );
}

function EditProfile({ profile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (values) => api.patch('/professionals/me', values),
    onSuccess: (updated) => {
      queryClient.setQueryData(['professionals', 'me'], { ...profile, ...updated });
      queryClient.invalidateQueries({ queryKey: ['professional', profile._id] });
      toast('Profile saved');
    },
  });

  if (!profile) return <EmptyState title="No profile found">Contact support so we can set your profile up.</EmptyState>;
  return (
    <Card>
      <ProfessionalForm profile={profile} mode="edit" mutation={save} submitLabel="Save profile" />
    </Card>
  );
}

export default Practice;

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarCheck, CalendarDays, ExternalLink, Inbox, NotebookPen } from 'lucide-react';
import { api } from '@/lib/api';
import { isUpcoming, isLive } from '@/lib/sessions';
import { Button, Card, Chip, EmptyState, Field, FormError, Modal, PageHeader, QueryState, Section, Textarea, useToast } from '@/components/ui';
import { ProfessionalForm } from '@/components/ProfessionalForm';
import { RatingSummary } from '@/components/Stars';
import { usePageTitle } from '@/hooks/usePageTitle';
import { JoinButton, SessionActions, SessionCard } from './Sessions';

const calendarMessages = {
  connected: ['Google Calendar connected', 'success'],
  cancelled: ['Google Calendar was not connected', 'error'],
  failed: ['We could not connect Google Calendar. Please try again', 'error'],
};

const Practice = () => {
  usePageTitle('My practice');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('calendar') ? 'profile' : 'sessions');
  const profile = useQuery({ queryKey: ['professionals', 'me'], queryFn: () => api.get('/professionals/me') });

  // Google sends the professional back here with ?calendar=... after connecting
  useEffect(() => {
    const message = calendarMessages[params.get('calendar')];
    if (!message) return;
    toast(...message);
    setParams({}, { replace: true });
  }, [params, setParams, toast]);

  return (
    <>
      <PageHeader
        title="My practice"
        description={profile.data && <RatingSummary average={profile.data.ratingAverage} count={profile.data.ratingCount} />}
        action={profile.data && (
          <Button to={`/therapists/${profile.data._id}`} variant="outline">See my public profile <ExternalLink className="h-4 w-4" aria-hidden="true" /></Button>
        )}
      />

      {profile.data?.institutionStatus === 'invited' && <Invitation profile={profile.data} />}

      <div className="mb-8 flex gap-2" role="group" aria-label="Section">
        <Chip selected={tab === 'sessions'} onClick={() => setTab('sessions')}>Sessions</Chip>
        <Chip selected={tab === 'profile'} onClick={() => setTab('profile')}>Profile, hours and calendar</Chip>
      </div>

      {tab === 'sessions' ? <AssignedSessions /> : <QueryState query={profile}>{(data) => <EditProfile profile={data} />}</QueryState>}
    </>
  );
};

// An institution has asked this professional to join. Nothing is shared
// until they say yes.
function Invitation({ profile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const answer = useMutation({
    mutationFn: (accept) => api.post('/professionals/me/institution', { accept }),
    onSuccess: (updated, accept) => {
      queryClient.setQueryData(['professionals', 'me'], updated);
      toast(accept ? `You are now part of ${profile.institution.organisationName}` : 'Invitation declined');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  return (
    <Card className="mb-8 border-transparent bg-honey-soft">
      <div className="flex items-start gap-4">
        <Building2 className="mt-1 h-6 w-6 shrink-0 text-honey-foreground dark:text-honey" aria-hidden="true" />
        <div>
          <p className="text-lg font-bold">{profile.institution?.organisationName} invited you to join them</p>
          <p className="mt-1 text-muted-foreground">
            If you accept, their name appears on your profile and they can see how many sessions you hold, your ratings and their value.
            They never see who your clients are or your notes.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button loading={answer.isPending && answer.variables} onClick={() => answer.mutate(true)}>Accept</Button>
            <Button variant="outline" onClick={() => answer.mutate(false)}>Decline</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

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
      toast({ confirmed: 'Confirmed. We have emailed them the link to join', cancelled: 'Session cancelled', completed: 'Marked as completed' }[status]);
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
      <SessionCard session={session} name={session.client?.fullName || 'Client'}>
        {session.clientNote && (
          <p className="mt-5 rounded-2xl bg-muted px-5 py-4"><span className="font-semibold">From the client: </span>{session.clientNote}</p>
        )}
        <SessionActions>{actions}</SessionActions>
      </SessionCard>
    </li>
  );

  return (
    <>
      <QueryState query={query}>
        {(sessions) => {
          const requests = sessions.filter((session) => session.status === 'pending' && isUpcoming(session)).reverse();
          const upcoming = sessions.filter((session) => session.status === 'confirmed' && isLive(session)).reverse();
          // Confirmed sessions whose time has passed still need to be closed off
          const toWrapUp = sessions.filter((session) => session.status === 'confirmed' && !isLive(session));
          const past = sessions.filter((session) => session.status === 'completed').slice(0, 20);

          if (sessions.length === 0) {
            return (
              <EmptyState icon={Inbox} title="No bookings yet">
                When someone books one of your open times, it shows here for you to accept. Check that your weekly hours are set under "Profile, hours and calendar".
              </EmptyState>
            );
          }

          return (
            <div className="space-y-12">
              <Section title={`Requests waiting for you (${requests.length})`} icon={Inbox}>
                {requests.length === 0 ? <p className="text-muted-foreground">You're all caught up.</p> : (
                  <ul className="space-y-5">
                    {requests.map((session) => renderSession(session, (
                      <>
                        <Button onClick={() => setStatus.mutate({ session, status: 'confirmed' })}>Accept</Button>
                        <Button variant="outline" onClick={() => setStatus.mutate({ session, status: 'cancelled' })}>Decline</Button>
                      </>
                    )))}
                  </ul>
                )}
              </Section>

              {toWrapUp.length > 0 && (
                <Section title="Finished? Mark them completed">
                  <ul className="space-y-5">
                    {toWrapUp.map((session) => renderSession(session, (
                      <>
                        <Button onClick={() => setStatus.mutate({ session, status: 'completed' })}>Mark completed</Button>
                        {notesButton(session)}
                      </>
                    )))}
                  </ul>
                </Section>
              )}

              <Section title="Upcoming" icon={CalendarDays}>
                {upcoming.length === 0 ? <p className="text-muted-foreground">No confirmed sessions coming up.</p> : (
                  <ul className="space-y-5">
                    {upcoming.map((session) => renderSession(session, (
                      <>
                        <JoinButton session={session} />
                        {notesButton(session)}
                        {isUpcoming(session) && (
                          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { if (window.confirm('Cancel this confirmed session? We will email the client.')) setStatus.mutate({ session, status: 'cancelled' }); }}>Cancel session</Button>
                        )}
                      </>
                    )))}
                  </ul>
                )}
              </Section>

              {past.length > 0 && (
                <Section title="Completed">
                  <ul className="space-y-5">{past.map((session) => renderSession(session, notesButton(session)))}</ul>
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

// Connecting Google Calendar keeps bookings clear of the professional's other
// commitments and gives every confirmed session a Google Meet link.
function GoogleCalendar() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ['google', 'status'], queryFn: () => api.get('/google/status') });

  const connect = useMutation({
    mutationFn: () => api.get('/google/connect'),
    // Hand over to Google's own sign-in page; it sends them back to this page
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast(error.message, 'error'),
  });
  const disconnect = useMutation({
    mutationFn: () => api.delete('/google/connect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google'] });
      toast('Google Calendar disconnected');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  if (!status.data) return null;
  const { available, connected, email } = status.data;

  return (
    <Card className="mb-8">
      <div className="flex items-start gap-4">
        <CalendarCheck className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl">Google Calendar and Meet</h2>
          {connected ? (
            <>
              <p className="mt-1 text-muted-foreground">
                Connected{email ? ` as ${email}` : ''}. Times you're busy in your calendar are not offered for booking, and each
                session you accept is added to your calendar with a Google Meet link.
              </p>
              <Button variant="outline" size="sm" className="mt-5" loading={disconnect.isPending} onClick={() => disconnect.mutate()}>Disconnect</Button>
            </>
          ) : available ? (
            <>
              <p className="mt-1 text-muted-foreground">
                Connect your calendar so people can only book when you're really free. Sessions you accept are added to it
                automatically, with a Google Meet link sent to your client.
              </p>
              <Button className="mt-5" loading={connect.isPending} onClick={() => connect.mutate()}>Connect Google Calendar</Button>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">
              Not available yet. For now, each session you accept gets a private video room, or your own meeting link if you add one below.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function EditProfile({ profile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (values) => api.patch('/professionals/me', values),
    onSuccess: (updated) => {
      queryClient.setQueryData(['professionals', 'me'], { ...profile, ...updated, institution: profile.institution });
      queryClient.invalidateQueries({ queryKey: ['professional', profile._id] });
      toast('Profile saved');
    },
  });
  const leave = useMutation({
    mutationFn: () => api.post('/professionals/me/institution', { accept: false }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['professionals', 'me'], updated);
      toast('You have left the institution');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  if (!profile) return <EmptyState title="No profile found">Contact support so we can set your profile up.</EmptyState>;
  return (
    <>
      <GoogleCalendar />
      {profile.institutionStatus === 'active' && (
        <Card className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
            You are part of <strong>{profile.institution?.organisationName}</strong>
          </p>
          <Button variant="outline" size="sm" loading={leave.isPending} onClick={() => { if (window.confirm(`Leave ${profile.institution?.organisationName}?`)) leave.mutate(); }}>Leave</Button>
        </Card>
      )}
      <Card>
        <ProfessionalForm profile={profile} mode="edit" mutation={save} submitLabel="Save profile" />
      </Card>
    </>
  );
}

export default Practice;

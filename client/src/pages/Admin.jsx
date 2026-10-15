import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Lightbulb, Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { DAY_SHORT, formatClock, formatDate, formatMoney } from '@/lib/format';
import { NUGGET_TYPES, PROFESSIONAL_TYPES } from '@/lib/options';
import { Avatar, Badge, Button, Card, Chip, EmptyState, Field, FormError, Input, Modal, PageHeader, QueryState, StatTiles, Textarea, useToast } from '@/components/ui';
import { NuggetForm } from '@/components/NuggetForm';
import { usePageTitle } from '@/hooks/usePageTitle';

const Admin = () => {
  usePageTitle('Admin');
  const [tab, setTab] = useState('applications');
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.get('/admin/stats') });

  const tiles = stats.data ? [
    { label: 'People signed up', value: stats.data.users, note: `${stats.data.newUsers} in the last 30 days` },
    { label: 'Approved professionals', value: stats.data.professionals, note: `${stats.data.pendingApplications} waiting for review` },
    { label: 'Upcoming sessions', value: stats.data.upcomingSessions, note: `${stats.data.completedSessions} completed so far` },
    { label: 'Published nuggets', value: stats.data.publishedNuggets, note: `${stats.data.nuggetsInReview} waiting for review` },
  ] : [];

  return (
    <>
      <PageHeader title="Admin" description="Review applications and content, and keep an eye on how the platform is doing." />

      <QueryState query={stats}>
        {() => <StatTiles tiles={tiles} />}
      </QueryState>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Section">
        <Chip selected={tab === 'applications'} onClick={() => setTab('applications')}>
          Applications{stats.data?.pendingApplications ? ` (${stats.data.pendingApplications})` : ''}
        </Chip>
        <Chip selected={tab === 'nuggets'} onClick={() => setTab('nuggets')}>
          Nuggets{stats.data?.nuggetsInReview ? ` (${stats.data.nuggetsInReview})` : ''}
        </Chip>
        <Chip selected={tab === 'users'} onClick={() => setTab('users')}>People</Chip>
      </div>

      {tab === 'applications' && <Applications />}
      {tab === 'nuggets' && <NuggetReview />}
      {tab === 'users' && <People />}
    </>
  );
};

function Applications() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');

  // Opened from the Approved tab: taking someone out of the directory
  const removing = rejecting?.status === 'approved';

  const query = useQuery({ queryKey: ['admin', 'applications', status], queryFn: () => api.get('/admin/applications', { status }) });

  const review = useMutation({
    mutationFn: ({ application, decision, reviewNote }) =>
      api.patch(`/admin/applications/${application._id}`, { status: decision, reviewNote: reviewNote || undefined }),
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      setRejecting(null);
      toast(decision === 'approved' ? 'Approved and listed' : 'Application sent back');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  return (
    <>
      <div className="mb-4 flex gap-2" role="group" aria-label="Application status">
        {['pending', 'approved', 'rejected'].map((value) => (
          <Chip key={value} selected={status === value} onClick={() => setStatus(value)} className="capitalize">{value}</Chip>
        ))}
      </div>

      <QueryState query={query}>
        {(applications) => applications.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title={status === 'pending' ? 'No applications waiting' : `No ${status} applications`} />
        ) : (
          <ul className="space-y-5">
            {applications.map((application) => (
              <li key={application._id}>
                <Card>
                  <div className="flex flex-wrap items-start gap-3">
                    <Avatar name={application.user?.fullName} />
                    {/* Wide enough that the buttons wrap below on a phone instead of squeezing this */}
                    <div className="min-w-[12rem] flex-1">
                      <h2 className="text-lg">{application.organisationName || application.user?.fullName}</h2>
                      {application.organisationName && <p className="text-sm">Contact: {application.user?.fullName}</p>}
                      <p className="break-words text-sm text-muted-foreground">{application.user?.email}{application.user?.phone ? ` · ${application.user.phone}` : ''}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="primary">{PROFESSIONAL_TYPES[application.type]}</Badge>
                        {application.title && <Badge>{application.title}</Badge>}
                      </div>
                    </div>
                    {status !== 'approved' && (
                      <div className="flex gap-2">
                        {status === 'pending' && <Button variant="outline" size="sm" onClick={() => { setNote(''); setRejecting(application); }}>Send back</Button>}
                        <Button size="sm" loading={review.isPending && review.variables?.application._id === application._id} onClick={() => review.mutate({ application, decision: 'approved' })}>Approve</Button>
                      </div>
                    )}
                    {status === 'approved' && <Button variant="outline" size="sm" onClick={() => { setNote(''); setRejecting(application); }}>Remove from directory</Button>}
                  </div>

                  <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <Detail label="Location">{application.location || 'Not given'}</Detail>
                    {application.type !== 'institution' && (
                      <>
                        <Detail label="Licence number">{application.licenseNumber || 'Not given'}</Detail>
                        <Detail label="Experience">{application.yearsExperience != null ? `${application.yearsExperience} years` : 'Not given'}</Detail>
                        <Detail label="Rate">{formatMoney(application.rate?.amount)} for {application.sessionMinutes} min</Detail>
                        <Detail label="Helps with">{application.specialties.join(', ') || 'Not given'}</Detail>
                        <Detail label="Languages">{application.languages.join(', ') || 'Not given'}</Detail>
                        <Detail label="Hours" wide>
                          {application.availability.length
                            ? application.availability.map((window) => `${DAY_SHORT[window.day]} ${formatClock(window.start)} to ${formatClock(window.end)}`).join(' · ')
                            : 'None set'}
                        </Detail>
                      </>
                    )}
                    {application.bio && <Detail label="Bio" wide>{application.bio}</Detail>}
                    {application.reviewNote && <Detail label="Note sent to applicant" wide>{application.reviewNote}</Detail>}
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {/* Sending back a pending application and removing an approved
          professional are the same API call, but very different for the person */}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        dirty={!!note.trim()}
        title={removing
          ? `Remove ${rejecting?.organisationName || rejecting?.user?.fullName || 'this professional'} from the directory?`
          : `Send back ${rejecting?.user?.fullName || 'application'}?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" loading={review.isPending} onClick={() => review.mutate({ application: rejecting, decision: 'rejected', reviewNote: note })}>
              {removing ? 'Remove' : 'Send back'}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          {removing
            ? 'They disappear from the directory and lose their practice page. Their upcoming sessions, and any under way, are cancelled and each client is emailed. They can update their application and send it again.'
            : 'They will not be listed in the directory, and can update their application and send it again.'}
        </p>
        <Field label={removing ? 'Why are they being removed?' : 'What needs to change?'} hint="The applicant will see this.">
          {(field) => <Textarea {...field} rows={4} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />}
        </Field>
      </Modal>
    </>
  );
}

function Detail({ label, wide, children }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line">{children}</dd>
    </div>
  );
}

function NuggetReview() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('review');
  const [writing, setWriting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['admin', 'nuggets', status, page], queryFn: () => api.get('/nuggets', { status, page, limit: 20 }) });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin'] }),
    queryClient.invalidateQueries({ queryKey: ['nuggets'] }),
  ]);

  const setNuggetStatus = useMutation({
    mutationFn: ({ nugget, next }) => api.patch(`/nuggets/${nugget._id}`, { status: next }),
    onSuccess: async (_, { next }) => {
      toast(next === 'published' ? 'Published' : 'Unpublished');
      await refresh();
    },
    onError: (error) => toast(error.message, 'error'),
  });
  const changing = (nugget) => setNuggetStatus.isPending && setNuggetStatus.variables?.nugget._id === nugget._id;

  const remove = useMutation({
    mutationFn: (nugget) => api.delete(`/nuggets/${nugget._id}`),
    onSuccess: () => {
      refresh();
      setDeleting(null);
      toast('Nugget deleted');
    },
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2" role="group" aria-label="Nugget status">
          <Chip selected={status === 'review'} onClick={() => { setStatus('review'); setPage(1); }}>Waiting for review</Chip>
          <Chip selected={status === 'published'} onClick={() => { setStatus('published'); setPage(1); }}>Published</Chip>
          <Chip selected={status === 'draft'} onClick={() => { setStatus('draft'); setPage(1); }}>Drafts</Chip>
        </div>
        <Button size="sm" onClick={() => setWriting(true)}>Write a nugget</Button>
      </div>
      <NuggetForm open={writing} onClose={() => setWriting(false)} />

      <QueryState query={query}>
        {(data) => data.items.length === 0 ? (
          <EmptyState icon={Lightbulb} title={status === 'review' ? 'Nothing waiting for review' : 'Nothing here'} />
        ) : (
          <>
            <ul className="space-y-5">
              {data.items.map((nugget) => (
                <li key={nugget._id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone={NUGGET_TYPES[nugget.type]?.tone}>{NUGGET_TYPES[nugget.type]?.label}</Badge>
                          <Badge>{nugget.topic}</Badge>
                        </div>
                        <h2 className="mt-2 text-base">{nugget.title}</h2>
                        <p className="text-sm text-muted-foreground">by {nugget.author?.fullName || 'Healing Hive'} · {formatDate(nugget.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { remove.reset(); setDeleting(nugget); }}>Delete</Button>
                        {nugget.status === 'published'
                          ? <Button variant="outline" size="sm" loading={changing(nugget)} onClick={() => setNuggetStatus.mutate({ nugget, next: 'draft' })}>Unpublish</Button>
                          : <Button size="sm" loading={changing(nugget)} onClick={() => setNuggetStatus.mutate({ nugget, next: 'published' })}>Publish</Button>}
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-line leading-relaxed">{nugget.content}</p>
                  </Card>
                </li>
              ))}
            </ul>
            <Pager page={page} pages={data.pages} onChange={setPage} />
          </>
        )}
      </QueryState>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this nugget?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(deleting)}>Delete</Button>
          </>
        }
      >
        <p>"{deleting?.title}" will be permanently deleted.</p>
        <FormError error={remove.error} />
      </Modal>
    </>
  );
}

function People() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  // Search once typing pauses, not on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: ['admin', 'users', q, page],
    queryFn: () => api.get('/admin/users', { q: q || undefined, page }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Search people by name or email"
          placeholder="Search by name or email"
          className="pl-11"
          maxLength={80}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <QueryState query={query}>
        {({ items: users, total, pages }) => users.length === 0 ? (
          <EmptyState icon={Users} title={q ? 'Nobody matches that search' : 'Nobody has signed up yet'} />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{total} {total === 1 ? 'person' : 'people'}{q ? ' found' : ''}, newest first</p>
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">People who have signed up, newest first</caption>
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Account</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((person) => (
                    <tr key={person._id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{person.fullName}</td>
                      <td className="px-4 py-3">{person.email}</td>
                      <td className="px-4 py-3"><Badge tone={person.role === 'user' ? 'neutral' : 'primary'} className="capitalize">{person.role}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(person.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Pager page={page} pages={pages} onChange={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}

// Previous / Next under a list that comes a page at a time
function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );
}

export default Admin;

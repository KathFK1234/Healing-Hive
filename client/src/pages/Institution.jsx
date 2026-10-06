import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { PROFESSIONAL_TYPES } from '@/lib/options';
import { Avatar, Badge, Button, Card, Chip, EmptyState, Field, FormError, Input, Modal, PageHeader, QueryState, useToast } from '@/components/ui';
import { ProfessionalForm } from '@/components/ProfessionalForm';
import { RatingSummary } from '@/components/Stars';
import { usePageTitle } from '@/hooks/usePageTitle';

const Institution = () => {
  usePageTitle('My institution');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('team');
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [removing, setRemoving] = useState(null);

  const query = useQuery({ queryKey: ['institution'], queryFn: () => api.get('/institutions/me') });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['institution'] });

  const invite = useMutation({
    mutationFn: () => api.post('/institutions/me/members', { email }),
    onSuccess: () => {
      refresh();
      setInviting(false);
      setEmail('');
      toast('Invitation sent');
    },
  });

  const remove = useMutation({
    mutationFn: (member) => api.delete(`/institutions/me/members/${member._id}`),
    onSuccess: () => {
      refresh();
      setRemoving(null);
      toast('Removed from your team');
    },
  });

  const save = useMutation({
    mutationFn: (values) => api.patch('/professionals/me', values),
    onSuccess: () => {
      refresh();
      toast('Details saved');
    },
  });

  return (
    <QueryState query={query}>
      {({ institution, members, totals }) => {
        const tiles = [
          { label: 'Team members', value: totals.members, note: totals.invited ? `${totals.invited} invited, not yet accepted` : 'Active on Healing Hive' },
          { label: 'Upcoming sessions', value: totals.upcoming, note: 'Booked and not yet held' },
          { label: 'Sessions completed', value: totals.completed, note: `${totals.completedThisMonth} in the last 30 days` },
          { label: 'Value of completed sessions', value: formatMoney(totals.completedValue), note: 'At the price booked. Online payment is not live yet' },
        ];
        return (
          <>
            <PageHeader
              title={institution.organisationName || 'My institution'}
              description={totals.ratingCount ? <RatingSummary average={totals.ratingAverage} count={totals.ratingCount} /> : 'How your team is doing on Healing Hive.'}
              action={<Button onClick={() => { invite.reset(); setInviting(true); }}><UserPlus className="h-5 w-5" aria-hidden="true" /> Invite a professional</Button>}
            />

            <dl className="mb-12 grid gap-4 sm:grid-cols-2">
              {tiles.map((tile) => (
                <Card key={tile.label} className="sm:p-6">
                  <dt className="font-semibold text-muted-foreground">{tile.label}</dt>
                  <dd className="mt-2 text-3xl font-bold">{typeof tile.value === 'number' ? tile.value.toLocaleString() : tile.value}</dd>
                  <dd className="mt-1 text-sm text-muted-foreground">{tile.note}</dd>
                </Card>
              ))}
            </dl>

            <div className="mb-8 flex gap-2" role="group" aria-label="Section">
              <Chip selected={tab === 'team'} onClick={() => setTab('team')}>Team</Chip>
              <Chip selected={tab === 'details'} onClick={() => setTab('details')}>Institution details</Chip>
            </div>

            {tab === 'details' ? (
              <Card><ProfessionalForm profile={institution} mode="edit" type="institution" mutation={save} submitLabel="Save details" /></Card>
            ) : members.length === 0 ? (
              <EmptyState icon={Users} title="Nobody on your team yet" action={<Button onClick={() => setInviting(true)}>Invite a professional</Button>}>
                Invite therapists and peer counsellors who are already verified on Healing Hive. They choose whether to accept.
              </EmptyState>
            ) : (
              <>
                <ul className="space-y-5">
                  {members.map((member) => (
                    <li key={member._id}>
                      <Card>
                        <div className="flex flex-wrap items-start gap-4">
                          <Avatar name={member.user?.fullName} />
                          <div className="min-w-0 flex-1">
                            <h2 className="text-xl">{member.user?.fullName}</h2>
                            <p className="text-muted-foreground">{member.title || PROFESSIONAL_TYPES[member.type]} · {member.user?.email}</p>
                            {member.institutionStatus === 'active' && <p className="mt-2"><RatingSummary average={member.ratingAverage} count={member.ratingCount} /></p>}
                          </div>
                          {member.institutionStatus === 'invited'
                            ? <Badge tone="honey">Invited, waiting for them</Badge>
                            : <Badge tone="primary">Active</Badge>}
                        </div>

                        {member.institutionStatus === 'active' && (
                          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-4">
                            <Stat label="Upcoming">{member.stats.upcoming}</Stat>
                            <Stat label="Completed">{member.stats.completed}</Stat>
                            <Stat label="People seen">{member.stats.clients}</Stat>
                            <Stat label="Value">{formatMoney(member.stats.completedValue)}</Stat>
                          </dl>
                        )}
                        <div className="mt-6 flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => { remove.reset(); setRemoving(member); }}>
                            {member.institutionStatus === 'invited' ? 'Withdraw invitation' : 'Remove from team'}
                          </Button>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-muted-foreground">
                  You see numbers only. Who your team's clients are, and what is said in sessions, stays between them.
                </p>
              </>
            )}

            <Modal
              open={inviting}
              onClose={() => setInviting(false)}
              title="Invite a professional"
              footer={
                <>
                  <Button variant="outline" onClick={() => setInviting(false)}>Cancel</Button>
                  <Button type="submit" form="invite-form" loading={invite.isPending} disabled={!email.trim()}>Send invitation</Button>
                </>
              }
            >
              <form id="invite-form" className="space-y-5" onSubmit={(event) => { event.preventDefault(); invite.mutate(); }}>
                <p className="text-muted-foreground">
                  They need to be a therapist or peer counsellor already verified on Healing Hive. We'll email them, and they appear on your team once they accept.
                </p>
                <FormError error={invite.error} />
                <Field label="Their email on Healing Hive">
                  {(field) => <Input {...field} type="email" required placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />}
                </Field>
              </form>
            </Modal>

            <Modal
              open={!!removing}
              onClose={() => setRemoving(null)}
              title={`Remove ${removing?.user?.fullName || ''}?`}
              footer={
                <>
                  <Button variant="outline" onClick={() => setRemoving(null)}>Keep</Button>
                  <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(removing)}>Remove</Button>
                </>
              }
            >
              <p>They stay on Healing Hive and keep their bookings, but will no longer be shown as part of {institution.organisationName}.</p>
              <FormError error={remove.error} />
            </Modal>
          </>
        );
      }}
    </QueryState>
  );
};

function Stat({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold">{children}</dd>
    </div>
  );
}

export default Institution;

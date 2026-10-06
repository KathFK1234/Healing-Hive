import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { DAY_SHORT, clockToMinutes, formatClock } from '@/lib/format';
import { Button, Card, Chip, EmptyState, Field, FormError, Input, Modal, PageHeader, QueryState, useToast } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

const suggestions = ['Drink some water', 'Step outside for 10 minutes', 'Take your medication', 'Wind down for bed', 'Write in your journal'];
const everyDay = [0, 1, 2, 3, 4, 5, 6];
const blank = { message: '', time: '08:00', days: everyDay };

function describeDays(days) {
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort();
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join() === '0,6') return 'Weekends';
  return sorted.map((day) => DAY_SHORT[day]).join(', ');
}

const Reminders = () => {
  usePageTitle('Reminders');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);

  const query = useQuery({ queryKey: ['reminders'], queryFn: () => api.get('/reminders') });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['reminders'] });

  const create = useMutation({
    mutationFn: () => api.post('/reminders', { message: draft.message, time: clockToMinutes(draft.time), days: draft.days }),
    onSuccess: () => {
      refresh();
      setDraft(null);
      toast('Reminder added');
    },
  });

  const toggle = useMutation({
    mutationFn: (reminder) => api.patch(`/reminders/${reminder._id}`, { enabled: !reminder.enabled }),
    onSuccess: refresh,
    onError: (error) => toast(error.message, 'error'),
  });

  const remove = useMutation({
    mutationFn: (reminder) => api.delete(`/reminders/${reminder._id}`),
    onSuccess: () => {
      refresh();
      toast('Reminder deleted');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const openNew = () => {
    create.reset();
    setDraft(blank);
  };

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Small nudges for the habits that keep you steady. They show on your home page on the days you choose."
        action={<Button onClick={openNew}><Plus className="h-4 w-4" aria-hidden="true" /> New reminder</Button>}
      />

      <p className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        Reminders by SMS and email are coming soon. For now they appear inside Healing Hive.
      </p>

      <QueryState query={query}>
        {(reminders) => reminders.length === 0 ? (
          <EmptyState icon={Bell} title="No reminders yet" action={<Button onClick={openNew}>Add your first reminder</Button>}>
            Start with one small thing, like drinking water or winding down before bed.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {reminders.map((reminder) => (
              <li key={reminder._id}>
                <Card className="flex items-center gap-4">
                  <div className={reminder.enabled ? 'min-w-0 flex-1' : 'min-w-0 flex-1 opacity-60'}>
                    <p className="text-lg font-bold">{formatClock(reminder.time)}</p>
                    <p className="truncate">{reminder.message}</p>
                    <p className="text-sm text-muted-foreground">{describeDays(reminder.days)}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reminder.enabled}
                    aria-label={`${reminder.message}: ${reminder.enabled ? 'on' : 'off'}`}
                    onClick={() => toggle.mutate(reminder)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${reminder.enabled ? 'bg-primary' : 'bg-border'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${reminder.enabled ? 'left-6' : 'left-1'}`} />
                  </button>
                  <button type="button" onClick={() => remove.mutate(reminder)} aria-label={`Delete reminder: ${reminder.message}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="New reminder"
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button type="submit" form="reminder-form" loading={create.isPending} disabled={!draft?.message.trim() || !draft?.days.length}>Add reminder</Button>
          </>
        }
      >
        {draft && (
          <form id="reminder-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
            <FormError error={create.error} />
            <Field label="Remind me to…">
              {(field) => <Input {...field} required maxLength={140} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} />}
            </Field>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setDraft({ ...draft, message: suggestion })} className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted">
                  {suggestion}
                </button>
              ))}
            </div>
            <Field label="At">
              {(field) => <Input {...field} type="time" required className="w-40" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} />}
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">On</legend>
              <div className="flex flex-wrap gap-2">
                {everyDay.map((day) => (
                  <Chip
                    key={day}
                    selected={draft.days.includes(day)}
                    onClick={() => setDraft({ ...draft, days: draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day] })}
                  >
                    {DAY_SHORT[day]}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <p className="text-sm text-muted-foreground">
              {draft.time && formatClock(clockToMinutes(draft.time))} East Africa Time, {draft.days.length ? describeDays(draft.days).toLowerCase() : 'pick at least one day'}.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
};

export default Reminders;

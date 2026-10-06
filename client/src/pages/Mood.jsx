import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, localDay } from '@/lib/format';
import { moodFor } from '@/lib/moods';
import { Badge, Card, EmptyState, PageHeader, QueryState, Section, useToast } from '@/components/ui';
import { MoodCheckIn } from '@/components/MoodCheckIn';
import { usePageTitle } from '@/hooks/usePageTitle';

const DAYS = 30;

// One column per day for the last 30 days: the day's average mood, or a gap.
function dailyAverages(moods) {
  const byDay = new Map();
  for (const mood of moods) {
    const key = localDay(mood.createdAt);
    byDay.set(key, [...(byDay.get(key) || []), mood.score]);
  }
  return Array.from({ length: DAYS }, (_, index) => {
    const date = Date.now() - (DAYS - 1 - index) * 86400000;
    const scores = byDay.get(localDay(date));
    return { date, average: scores ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null };
  });
}

const Mood = () => {
  usePageTitle('Mood');
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['moods', DAYS], queryFn: () => api.get('/moods', { days: DAYS }) });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/moods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moods'] });
      toast('Check-in deleted');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  return (
    <>
      <PageHeader title="Mood" description="Check in as often as you like. Over time you'll see what lifts you and what weighs on you." />

      <Card className="mb-8">
        <h2 className="mb-4 text-lg">How are you feeling right now?</h2>
        <MoodCheckIn />
      </Card>

      <QueryState query={query}>
        {(moods) => moods.length === 0 ? (
          <EmptyState icon={Activity} title="No check-ins yet">Your first check-in above starts your history.</EmptyState>
        ) : (
          <div className="space-y-8">
            <Section title="Last 30 days" icon={Activity}>
              <Card>
                <Chart days={dailyAverages(moods)} />
              </Card>
            </Section>

            <Section title="Check-ins">
              <ul className="space-y-2">
                {moods.map((mood) => (
                  <li key={mood._id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <span className="text-2xl" aria-hidden="true">{moodFor(mood.score).emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{moodFor(mood.score).label} <span className="font-semibold text-muted-foreground">· {formatDateTime(mood.createdAt)}</span></p>
                      {mood.note && <p className="text-sm text-muted-foreground">{mood.note}</p>}
                      {mood.tags?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">{mood.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove.mutate(mood._id)}
                      aria-label={`Delete check-in from ${formatDateTime(mood.createdAt)}`}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}
      </QueryState>
    </>
  );
};

function Chart({ days }) {
  const logged = days.filter((day) => day.average !== null);
  const average = logged.reduce((sum, day) => sum + day.average, 0) / logged.length;
  return (
    <figure>
      <figcaption className="mb-4 text-sm text-muted-foreground">
        You checked in on <strong className="text-foreground">{logged.length}</strong> of the last {DAYS} days.
        Your average mood was <strong className="text-foreground">{moodFor(Math.round(average)).label.toLowerCase()}</strong>.
      </figcaption>
      {/* Decorative: the sentence above and the list below carry the same information */}
      <div className="flex h-32 items-end gap-[3px]" aria-hidden="true">
        {days.map((day) => (
          <div key={day.date} className="flex h-full flex-1 items-end rounded-sm bg-muted">
            {day.average !== null && (
              <div
                className={`w-full rounded-sm ${moodFor(Math.round(day.average)).bar}`}
                style={{ height: `${(day.average / 5) * 100}%` }}
                title={`${localDay(day.date)}: ${moodFor(Math.round(day.average)).label}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground" aria-hidden="true">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </figure>
  );
}

export default Mood;

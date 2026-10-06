import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronRight, Flame, HeartHandshake, MessageCircle, NotebookPen, Video } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { firstName, formatClock, formatDateTime, greeting, localDay } from '@/lib/format';
import { moodFor } from '@/lib/moods';
import { isUpcoming, canJoin } from '@/lib/sessions';
import { Badge, Button, Card } from '@/components/ui';
import { MoodCheckIn } from '@/components/MoodCheckIn';
import { usePageTitle } from '@/hooks/usePageTitle';

const shortcuts = [
  { to: '/therapists', icon: HeartHandshake, label: 'Find someone to talk to', text: 'Therapists and peer counsellors' },
  { to: '/companion', icon: MessageCircle, label: 'Talk it through now', text: 'The AI companion is here at any hour' },
  { to: '/journal', icon: NotebookPen, label: 'Write it down', text: 'Your private journal' },
];

// Days in a row, ending today or yesterday, with at least one check-in.
function streakOf(moods) {
  const days = new Set(moods.map((mood) => localDay(mood.createdAt)));
  let cursor = Date.now();
  if (!days.has(localDay(cursor))) cursor -= 86400000;
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak++;
    cursor -= 86400000;
  }
  return streak;
}

// The home page shows a few things, in the order they matter: how you are,
// what's next, one idea for today, and three ways to get support.
const Home = () => {
  usePageTitle('Home');
  const { user } = useAuth();
  const [checkingInAgain, setCheckingInAgain] = useState(false);

  const moods = useQuery({ queryKey: ['moods', 30], queryFn: () => api.get('/moods', { days: 30 }) });
  const sessions = useQuery({ queryKey: ['sessions', 'mine'], queryFn: () => api.get('/sessions/mine') });
  const nugget = useQuery({ queryKey: ['nuggets', 'today'], queryFn: () => api.get('/nuggets/today') });
  const reminders = useQuery({ queryKey: ['reminders'], queryFn: () => api.get('/reminders') });

  const today = localDay(Date.now());
  const todaysMood = moods.data?.find((mood) => localDay(mood.createdAt) === today);
  const streak = moods.data ? streakOf(moods.data) : 0;
  const nextSession = sessions.data?.filter(isUpcoming).at(-1);
  // Midday on the EAT calendar day, so the weekday is right in any device timezone
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const todaysReminders = reminders.data?.filter((reminder) => reminder.enabled && reminder.days.includes(weekday)) || [];

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <header>
        <h1 className="text-3xl sm:text-4xl">{greeting()}, {firstName(user.fullName)}</h1>
        <p className="mt-3 text-lg text-muted-foreground">Take things one step at a time today.</p>
      </header>

      <Card className="border-transparent bg-primary-soft">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">How are you feeling?</h2>
          {streak > 1 && <Badge tone="honey" icon={Flame}>{streak} days in a row</Badge>}
        </div>
        {todaysMood && !checkingInAgain ? (
          <>
            <div className="flex items-center gap-5">
              <span className="text-5xl" aria-hidden="true">{moodFor(todaysMood.score).emoji}</span>
              <div className="min-w-0">
                <p className="text-lg font-bold">You checked in as {moodFor(todaysMood.score).label.toLowerCase()}</p>
                {todaysMood.note && <p className="truncate text-muted-foreground">{todaysMood.note}</p>}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => setCheckingInAgain(true)}>Check in again</Button>
              <Button to="/mood" variant="ghost" size="sm">See your history</Button>
            </div>
            {todaysMood.score <= 2 && (
              <p className="mt-6 rounded-2xl bg-card p-5">
                Rough days are easier with someone to talk to.{' '}
                <Link to="/companion" className="font-semibold text-primary hover:underline">Chat with the companion</Link> or{' '}
                <Link to="/therapists" className="font-semibold text-primary hover:underline">book a person</Link>.
                If it feels like too much, <Link to="/help" className="font-semibold text-danger hover:underline">get help now</Link>.
              </p>
            )}
          </>
        ) : (
          <MoodCheckIn onDone={() => setCheckingInAgain(false)} />
        )}
      </Card>

      <section aria-labelledby="next-heading">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="next-heading" className="text-xl">Your next session</h2>
          <Link to="/sessions" className="font-semibold text-primary hover:underline">All sessions</Link>
        </div>
        <Card>
          {nextSession ? (
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xl font-bold">{formatDateTime(nextSession.scheduledAt)}</p>
                <p className="mt-1 text-muted-foreground">with {nextSession.professional?.user?.fullName}</p>
                {nextSession.status === 'pending' && <Badge tone="honey" className="mt-3">Waiting for them to confirm</Badge>}
              </div>
              {canJoin(nextSession) && (
                <a href={nextSession.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90">
                  <Video className="h-5 w-5" aria-hidden="true" /> Join
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-5">
              <p className="text-muted-foreground">Nothing booked. Talking to someone can help, even when things are okay.</p>
              <Button to="/therapists" variant="soft">Find support <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          )}
        </Card>
      </section>

      {todaysReminders.length > 0 && (
        <section aria-labelledby="reminders-heading">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="reminders-heading" className="text-xl">Today's reminders</h2>
            <Link to="/reminders" className="font-semibold text-primary hover:underline">Manage</Link>
          </div>
          <Card className="divide-y divide-border py-2 sm:py-2">
            {todaysReminders.map((reminder) => (
              <p key={reminder._id} className="flex items-center gap-4 py-4">
                <span className="w-20 shrink-0 font-bold text-primary">{formatClock(reminder.time)}</span>
                <span className="truncate">{reminder.message}</span>
              </p>
            ))}
          </Card>
        </section>
      )}

      {nugget.data && (
        <section aria-labelledby="nugget-heading">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="nugget-heading" className="text-xl">Today's nugget</h2>
            <Link to="/nuggets" className="font-semibold text-primary hover:underline">More nuggets</Link>
          </div>
          <Card className="border-transparent bg-honey-soft">
            <p className="text-xl font-bold">{nugget.data.title}</p>
            <p className="mt-3 text-foreground/80">{nugget.data.content}</p>
          </Card>
        </section>
      )}

      <section aria-labelledby="help-heading">
        <h2 id="help-heading" className="mb-4 text-xl">What would help right now?</h2>
        <Card className="divide-y divide-border py-2 sm:py-2">
          {shortcuts.map(({ to, icon: Icon, label, text }) => (
            <Link key={to} to={to} className="group flex items-center gap-5 py-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold group-hover:text-primary">{label}</span>
                <span className="block text-muted-foreground">{text}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
};

export default Home;

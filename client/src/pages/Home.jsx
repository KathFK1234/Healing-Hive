import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, Bell, CalendarDays, Flame, HeartHandshake, Lightbulb, MessageCircle, NotebookPen, Hourglass } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { firstName, formatClock, formatDateTime, greeting, localDay } from '@/lib/format';
import { moodFor } from '@/lib/moods';
import { Badge, Button, Card, Section } from '@/components/ui';
import { MoodCheckIn } from '@/components/MoodCheckIn';
import { usePageTitle } from '@/hooks/usePageTitle';
import { isUpcoming } from '@/lib/sessions';

const shortcuts = [
  { to: '/therapists', icon: HeartHandshake, label: 'Find support', text: 'Therapists and peers' },
  { to: '/companion', icon: MessageCircle, label: 'AI companion', text: 'Talk it through now' },
  { to: '/journal', icon: NotebookPen, label: 'Journal', text: 'Write it down' },
  { to: '/nuggets', icon: Lightbulb, label: 'Nuggets', text: 'Learn in a minute' },
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

const Home = () => {
  usePageTitle('Home');
  const { user } = useAuth();
  const [checkingInAgain, setCheckingInAgain] = useState(false);

  const moods = useQuery({ queryKey: ['moods', 30], queryFn: () => api.get('/moods', { days: 30 }) });
  const sessions = useQuery({ queryKey: ['sessions', 'mine'], queryFn: () => api.get('/sessions/mine') });
  const nugget = useQuery({ queryKey: ['nuggets', 'today'], queryFn: () => api.get('/nuggets/today') });
  const reminders = useQuery({ queryKey: ['reminders'], queryFn: () => api.get('/reminders') });
  const application = useQuery({ queryKey: ['professionals', 'me'], queryFn: () => api.get('/professionals/me') });

  const today = localDay(Date.now());
  const todaysMood = moods.data?.find((mood) => localDay(mood.createdAt) === today);
  const streak = moods.data ? streakOf(moods.data) : 0;
  const nextSession = sessions.data?.filter(isUpcoming).at(-1);
  // new Date(`${today}T12:00Z`) is midday on the EAT calendar day, so the weekday is right in any device timezone
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const todaysReminders = reminders.data?.filter((reminder) => reminder.enabled && reminder.days.includes(weekday)) || [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl">{greeting()}, {firstName(user.fullName)}</h1>
        <p className="mt-1 text-muted-foreground">Take things one step at a time today.</p>
      </header>

      {application.data?.status === 'pending' && (
        <Card className="flex flex-wrap items-center gap-3 bg-honey-soft">
          <Hourglass className="h-5 w-5 text-honey-foreground dark:text-honey" aria-hidden="true" />
          <p className="flex-1 text-sm font-bold">Your professional application is being reviewed. We'll list you as soon as it's approved.</p>
          <Button to="/apply" variant="outline" size="sm">View application</Button>
        </Card>
      )}
      {application.data?.status === 'rejected' && (
        <Card className="flex flex-wrap items-center gap-3 bg-danger-soft">
          <p className="flex-1 text-sm font-bold">Your professional application needs changes before it can be approved.</p>
          <Button to="/apply" variant="outline" size="sm">See what to fix</Button>
        </Card>
      )}

      {/* Check-in */}
      <Card className="bg-gradient-to-br from-primary-soft to-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl">How are you feeling today?</h2>
          {streak > 1 && <Badge tone="honey" icon={Flame}>{streak}-day streak</Badge>}
        </div>
        {todaysMood && !checkingInAgain ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-4xl" aria-hidden="true">{moodFor(todaysMood.score).emoji}</span>
            <div className="min-w-[10rem] flex-1">
              <p className="font-extrabold">You checked in as {moodFor(todaysMood.score).label.toLowerCase()}</p>
              {todaysMood.note && <p className="truncate text-sm text-muted-foreground">{todaysMood.note}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCheckingInAgain(true)}>Check in again</Button>
              <Button to="/mood" variant="soft" size="sm"><Activity className="h-4 w-4" aria-hidden="true" /> History</Button>
            </div>
          </div>
        ) : (
          <MoodCheckIn onDone={() => setCheckingInAgain(false)} />
        )}
        {todaysMood && todaysMood.score <= 2 && !checkingInAgain && (
          <p className="mt-4 rounded-xl bg-card p-3 text-sm">
            Rough days are easier with someone to talk to.{' '}
            <Link to="/companion" className="font-bold text-primary hover:underline">Chat with the companion</Link> or{' '}
            <Link to="/therapists" className="font-bold text-primary hover:underline">book a person</Link>.
            If it feels like too much, <Link to="/help" className="font-bold text-danger hover:underline">get help now</Link>.
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next session */}
        <Section title="Next session" icon={CalendarDays} action={<Link to="/sessions" className="text-sm font-bold text-primary hover:underline">All sessions</Link>}>
          <Card className="h-[calc(100%-2.5rem)]">
            {nextSession ? (
              <>
                <p className="text-lg font-extrabold">{formatDateTime(nextSession.scheduledAt)}</p>
                <p className="text-muted-foreground">with {nextSession.professional?.user?.fullName}</p>
                <Badge tone={nextSession.status === 'confirmed' ? 'primary' : 'honey'} className="mt-3">
                  {nextSession.status === 'confirmed' ? 'Confirmed' : 'Waiting for confirmation'}
                </Badge>
              </>
            ) : (
              <>
                <p className="font-extrabold">Nothing booked</p>
                <p className="mt-1 text-sm text-muted-foreground">Talking to someone can help, even when things are going okay.</p>
                <Button to="/therapists" variant="soft" size="sm" className="mt-4">Find support <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              </>
            )}
          </Card>
        </Section>

        {/* Today's nugget */}
        <Section title="Today's nugget" icon={Lightbulb} action={<Link to="/nuggets" className="text-sm font-bold text-primary hover:underline">All nuggets</Link>}>
          <Card className="h-[calc(100%-2.5rem)] bg-honey-soft">
            {nugget.data ? (
              <>
                <p className="font-extrabold">{nugget.data.title}</p>
                <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-foreground/80">{nugget.data.content}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{nugget.isPending ? 'Loading…' : 'New nuggets are on the way.'}</p>
            )}
          </Card>
        </Section>
      </div>

      {todaysReminders.length > 0 && (
        <Section title="Today's reminders" icon={Bell} action={<Link to="/reminders" className="text-sm font-bold text-primary hover:underline">Manage</Link>}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {todaysReminders.map((reminder) => (
              <li key={reminder._id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className="text-sm font-extrabold text-primary">{formatClock(reminder.time)}</span>
                <span className="truncate text-sm">{reminder.message}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="What would help right now?">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {shortcuts.map(({ to, icon: Icon, label, text }) => (
            <li key={to}>
              <Link to={to} className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5">
                <Icon className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
                <span className="font-extrabold">{label}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

export default Home;

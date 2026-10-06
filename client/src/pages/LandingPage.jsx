import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, HeartHandshake, Users, MessageCircle, Lightbulb, NotebookPen, Bell, ShieldCheck, Lock, Languages } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Card, Badge } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { usePageTitle } from '@/hooks/usePageTitle';

// The first thing a visitor sees: four plain choices, so nobody has to work out
// which feature matches what they need.
const needs = [
  { to: '/therapists?type=therapist', icon: HeartHandshake, title: 'Talk to a therapist', text: 'Licensed professionals who understand your context.', tone: 'bg-primary-soft text-primary' },
  { to: '/therapists?type=peer', icon: Users, title: 'Talk to a peer', text: 'Trained counsellors your age, at a lower cost.', tone: 'bg-calm-soft text-calm' },
  { to: '/companion', icon: MessageCircle, title: 'Chat right now', text: 'An AI companion that listens, any hour.', tone: 'bg-honey-soft text-honey-foreground dark:text-honey' },
  { to: '/nuggets', icon: Lightbulb, title: 'Learn something', text: 'Short reads that bust myths and build skills.', tone: 'bg-warmth-soft text-warmth' },
];

const steps = [
  { title: 'Create your free account', text: 'An email and a password. It takes about a minute.' },
  { title: 'Pick the support that fits', text: 'Browse therapists and peer counsellors by what they help with, language and price.' },
  { title: 'Book a time that suits you', text: 'Choose an open slot and meet by video, voice or chat.' },
];

const tools = [
  { icon: NotebookPen, title: 'Private journal', text: 'A space for your thoughts that only you can open.' },
  { icon: Bell, title: 'Gentle reminders', text: 'Nudges for the habits that keep you steady.' },
  { icon: Lightbulb, title: 'Daily nugget', text: 'One small idea a day for your mental wellbeing.' },
];

const promises = [
  { icon: ShieldCheck, text: 'Every professional is checked before they are listed' },
  { icon: Lock, text: 'Your journal and check-ins are visible only to you' },
  { icon: Languages, text: 'Support in English, Swahili and more' },
];

const LandingPage = () => {
  usePageTitle();
  const nugget = useQuery({ queryKey: ['nuggets', 'today'], queryFn: () => api.get('/nuggets/today'), retry: false });

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-gradient-to-b from-honey-soft/60 to-background">
        <div className="container pb-20 pt-14 text-center sm:pb-28 sm:pt-20">
          <Badge tone="honey" className="mb-5">St;ll Here: your story isn't over</Badge>
          <h1 className="mx-auto max-w-3xl text-4xl leading-tight sm:text-5xl">
            Mental health support that understands where you're from
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Therapy, peer counselling and everyday tools for young people in Kenya. You're not alone in this.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/signup" size="lg">Get started free <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
            <Button to="/therapists" variant="outline" size="lg">Browse therapists</Button>
          </div>
        </div>
      </section>

      {/* What do you need? */}
      <section className="container -mt-8 sm:-mt-10" aria-labelledby="needs-heading">
        <h2 id="needs-heading" className="sr-only">What do you need today?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {needs.map(({ to, icon: Icon, title, text, tone }) => (
            <Link key={title} to={to} className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5">
              <span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="flex items-center gap-1 text-lg">
                {title}
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16">
        <h2 className="text-center text-3xl">How it works</h2>
        <ol className="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="text-center">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-extrabold text-primary-foreground">{index + 1}</span>
              <h3 className="text-lg">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Everyday tools + today's nugget */}
      <section className="border-y border-border bg-card">
        <div className="container grid gap-10 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl">Small things, every day</h2>
            <p className="mt-2 text-muted-foreground">Between sessions, or if you're not ready to talk to anyone yet.</p>
            <ul className="mt-6 space-y-5">
              {tools.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base">{title}</h3>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Card className="bg-honey-soft">
            <Badge tone="honey" icon={Lightbulb}>Today's nugget</Badge>
            <h3 className="mt-3 text-xl">{nugget.data?.title || "You're allowed to rest"}</h3>
            <p className="mt-2 leading-relaxed text-foreground/80">
              {nugget.data?.content || 'Rest is not something you earn by being productive. Taking a break today is part of looking after yourself.'}
            </p>
            <Link to="/nuggets" className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-primary hover:underline">
              Read more nuggets <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        </div>
      </section>

      {/* Trust */}
      <section className="container py-16">
        <ul className="grid gap-4 md:grid-cols-3">
          {promises.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl border border-border p-4">
              <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm font-bold">{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground">
          <h2 className="text-3xl">Ready when you are</h2>
          <p className="mx-auto mt-2 max-w-xl opacity-90">Start with a check-in, a nugget or a conversation. Go at your own pace.</p>
          <Button to="/signup" variant="honey" size="lg" className="mt-6">Create your free account</Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default LandingPage;

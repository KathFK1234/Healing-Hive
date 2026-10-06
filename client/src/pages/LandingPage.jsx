import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, HeartHandshake, Users, MessageCircle, Lightbulb } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { usePageTitle } from '@/hooks/usePageTitle';

// Four plain choices, so nobody has to work out which feature matches what they need.
const needs = [
  { to: '/therapists?type=therapist', icon: HeartHandshake, title: 'Talk to a therapist', text: 'Licensed professionals who understand your context.' },
  { to: '/therapists?type=peer', icon: Users, title: 'Talk to a peer', text: 'Trained counsellors your age, at a lower cost.' },
  { to: '/companion', icon: MessageCircle, title: 'Chat right now', text: 'An AI companion that listens, at any hour.' },
  { to: '/nuggets', icon: Lightbulb, title: 'Learn something', text: 'Short reads that bust myths and build skills.' },
];

const steps = [
  { title: 'Create a free account', text: 'An email and a password. About a minute.' },
  { title: 'Choose who to talk to', text: 'Browse by what you need help with, language and price.' },
  { title: 'Book a time', text: 'Pick an open slot and meet by video or voice call.' },
];

const LandingPage = () => {
  usePageTitle();
  const nugget = useQuery({ queryKey: ['nuggets', 'today'], queryFn: () => api.get('/nuggets/today'), retry: false });

  return (
    <PublicLayout>
      <section className="container max-w-3xl py-20 text-center sm:py-28">
        <p className="mb-6 font-semibold text-primary">St;ll Here. Your story isn't over.</p>
        <h1 className="text-4xl sm:text-6xl">You don't have to carry it alone</h1>
        <p className="mx-auto mt-6 max-w-xl text-xl text-muted-foreground">
          Therapy, peer counselling and everyday tools for young people in Kenya.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button to="/signup" size="lg">Get started free</Button>
          <Button to="/therapists" variant="outline" size="lg">Browse therapists</Button>
        </div>
      </section>

      <section className="bg-muted py-20" aria-labelledby="needs-heading">
        <div className="container max-w-4xl">
          <h2 id="needs-heading" className="mb-10 text-center text-3xl">What do you need today?</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {needs.map(({ to, icon: Icon, title, text }) => (
              <Link key={title} to={to} className="group flex items-start gap-5 rounded-3xl bg-card p-7 transition-colors hover:bg-primary-soft">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary group-hover:bg-card">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-xl font-bold">
                    {title}
                    <ArrowRight className="h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-muted-foreground">{text}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container max-w-4xl py-24">
        <h2 className="text-center text-3xl">How it works</h2>
        <ol className="mt-14 grid gap-12 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="text-center">
              <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-honey text-lg font-bold text-honey-foreground">{index + 1}</span>
              <h3 className="text-xl">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-honey-soft py-20">
        <figure className="container max-w-2xl text-center">
          <figcaption className="mb-5 flex items-center justify-center gap-2 font-semibold text-honey-foreground dark:text-honey">
            <Lightbulb className="h-5 w-5" aria-hidden="true" /> Today's nugget
          </figcaption>
          <h2 className="text-2xl sm:text-3xl">{nugget.data?.title || "You're allowed to rest"}</h2>
          <p className="mt-5 text-lg text-foreground/80">
            {nugget.data?.content || 'Rest is not something you earn by being productive. Taking a break today is part of looking after yourself.'}
          </p>
          <Link to="/nuggets" className="mt-6 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            Read more nuggets <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </figure>
      </section>

      <section className="container max-w-2xl pt-24 text-center">
        <h2 className="text-3xl sm:text-4xl">Ready when you are</h2>
        <p className="mt-4 text-lg text-muted-foreground">Start with a check-in, a nugget or a conversation. Go at your own pace.</p>
        <Button to="/signup" size="lg" className="mt-8">Create your free account</Button>
        <p className="mt-8 text-muted-foreground">
          A therapist, peer counsellor or institution? <Link to="/professionals" className="font-semibold text-primary hover:underline">Join as a professional</Link>
        </p>
      </section>
    </PublicLayout>
  );
};

export default LandingPage;

import { Link } from 'react-router-dom';
import { HeartHandshake, Users, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, PageHeader } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

const kinds = [
  { icon: HeartHandshake, title: 'Licensed therapists', text: 'Registered mental health professionals with a valid licence.' },
  { icon: Users, title: 'Peer counsellors', text: 'Trained peer supporters who can relate to what young people go through.' },
  { icon: Building2, title: 'Institutions', text: 'Clinics and organisations with therapists or counsellors on staff.' },
];

const steps = [
  { title: 'Sign up', text: 'Create your professional account and tell us about your practice. It takes about five minutes.' },
  { title: 'We verify you', text: 'Therapists are checked against their licence number. We email you the decision.' },
  { title: 'Start helping', text: 'Set your hours, connect your Google Calendar if you like, and accept bookings.' },
];

const ForProfessionals = () => {
  usePageTitle('For professionals');
  const { user } = useAuth();
  // Someone already signed in applies from their existing account instead.
  const applyTo = user ? '/apply' : '/professionals/signup';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Join our professional network"
        description="Help young people in Kenya get quality mental health support."
      />

      <ul className="space-y-4">
        {kinds.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg">{title}</h2>
              <p className="text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <Card className="mt-12">
        <h2 className="text-2xl">How it works</h2>
        <ol className="mt-6 space-y-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-honey font-bold text-honey-foreground">{index + 1}</span>
              <div>
                <h3 className="text-lg">{step.title}</h3>
                <p className="text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button to={applyTo} size="lg" className="mt-8">Apply to join</Button>
      </Card>

      {!user && (
        <p className="mt-8 text-center text-muted-foreground">
          Already applied? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to check your application.
        </p>
      )}
    </div>
  );
};

export default ForProfessionals;

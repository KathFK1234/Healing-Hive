import { HeartHandshake, Users, Building2, CircleCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, PageHeader } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

const kinds = [
  { icon: HeartHandshake, title: 'Licensed therapist', text: 'A registered mental health professional with a valid licence.' },
  { icon: Users, title: 'Peer counsellor', text: 'A trained peer supporter who can relate to what young people go through.' },
  { icon: Building2, title: 'Institution', text: 'A clinic or organisation with licensed therapists on staff.' },
];

const steps = [
  'Create an account, or sign in to the one you have.',
  'Tell us about your practice: what you help with, your languages, your hours and your rate.',
  'We verify your details. Therapists are checked against their licence number.',
  'Once approved you appear in the directory and people can book your open times.',
];

const ForProfessionals = () => {
  usePageTitle('For professionals');
  const { user } = useAuth();
  // Visitors are sent to sign up first, then straight on to the application.
  const applyLink = user ? { to: '/apply' } : { to: '/signup', state: { from: '/apply' } };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Join our professional network"
        description="Help young people in Kenya get quality mental health support. Apply as a therapist, a peer counsellor or an institution."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {kinds.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <Icon className="mb-3 h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="text-base">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="text-lg">How applying works</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li key={step} className="flex gap-3 text-sm">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              {step}
            </li>
          ))}
        </ol>
        <Button {...applyLink} size="lg" className="mt-6">Start your application</Button>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Looking for support instead? <Button to="/therapists" variant="ghost" size="sm">Find support</Button>
      </p>
    </div>
  );
};

export default ForProfessionals;

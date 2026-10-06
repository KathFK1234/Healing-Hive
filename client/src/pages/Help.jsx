import { Phone, MessageCircle, HeartHandshake } from 'lucide-react';
import { CRISIS_CONTACTS, telHref } from '@/lib/crisis';
import { Button, Card, PageHeader } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

// Deliberately has no data loading: this page must open even if the server is down.
const Help = () => {
  usePageTitle('Get help now');
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="You don't have to face this alone"
        description="If you are thinking about harming yourself, or you are in danger, please reach a person right now. These lines are staffed by people who want to help."
      />

      <ul className="space-y-3">
        {CRISIS_CONTACTS.map((contact, index) => (
          <li key={contact.phone}>
            <Card className={index === 0 ? 'border-danger/40 bg-danger-soft' : ''}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg">{contact.name}</h2>
                  <p className="text-sm text-muted-foreground">{contact.note}</p>
                </div>
                <a
                  href={telHref(contact.phone)}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-danger px-5 text-base font-extrabold text-white hover:bg-danger/90 dark:text-background"
                >
                  <Phone className="h-5 w-5" aria-hidden="true" />
                  Call {contact.phone}
                </a>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="mt-6">
        <h2 className="text-lg">While you wait, or if you can't call</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Tell someone near you that you trust how you are feeling, and ask them to stay with you.</li>
          <li>Move away from anything you could use to hurt yourself.</li>
          <li>Breathe out slowly, longer than you breathe in. Do it five times.</li>
          <li>Go to the nearest hospital if you can get there safely.</li>
        </ul>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button to="/therapists" variant="outline" size="lg"><HeartHandshake className="h-5 w-5" aria-hidden="true" /> Book a professional</Button>
        <Button to="/companion" variant="outline" size="lg"><MessageCircle className="h-5 w-5" aria-hidden="true" /> Talk to the AI companion</Button>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Healing Hive is not an emergency service, and the AI companion is not a substitute for one.
      </p>
    </div>
  );
};

export default Help;

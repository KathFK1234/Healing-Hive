import { useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, ExternalLink, Phone } from 'lucide-react';
import { Button } from '@/components/ui';
import { CRISIS_CONTACTS, telHref } from '@/lib/crisis';
import { HOSTING_STATUS_URL, outage } from '@/lib/outage';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LogoMark } from './Logo';

const EXPLANATION =
  "This is a problem on our side, most likely with the company that hosts our server, and nothing you did. Your information is safe. Please try again in a little while.";

function StatusLink() {
  return (
    <a href={HOSTING_STATUS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">
      Hosting status <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

// Across the top of every page while the server is out of reach. Pages that
// don't need the server keep working underneath it.
export function ServiceBanner() {
  const down = useSyncExternalStore(outage.subscribe, outage.get);
  const queryClient = useQueryClient();
  if (!down) return null;
  return (
    <div role="status" className="bg-calm-soft px-5 py-3 text-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
        <CloudOff className="h-5 w-5 shrink-0 text-calm" aria-hidden="true" />
        <p className="min-w-0 flex-1 basis-60">
          <span className="font-bold">Healing Hive can't reach its server right now.</span> {EXPLANATION}
        </p>
        <div className="flex items-center gap-3">
          <StatusLink />
          <Button variant="outline" size="sm" onClick={() => queryClient.refetchQueries({ type: 'active' })}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

// In place of the whole app when a signed-in person's account can't be loaded
// because the server is out of reach. The crisis numbers are kept in the app,
// so they are here whatever the server is doing.
export function ServiceUnavailable({ onRetry }) {
  usePageTitle('Temporarily unavailable');
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-12">
      <LogoMark className="mb-6 h-14 w-14" />
      <h1 className="text-3xl">Healing Hive is temporarily unavailable</h1>
      <p className="mt-3 text-muted-foreground">We can't reach our server right now. {EXPLANATION}</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button onClick={onRetry}>Try again</Button>
        <StatusLink />
      </div>

      <section aria-labelledby="crisis-heading" className="mt-10 rounded-3xl bg-danger-soft p-5">
        <h2 id="crisis-heading" className="text-lg">If you need help right now</h2>
        <ul className="mt-3 space-y-2">
          {CRISIS_CONTACTS.map((contact) => (
            <li key={contact.phone} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span><span className="font-semibold">{contact.name}</span> <span className="text-sm text-muted-foreground">· {contact.hours}</span></span>
              <a href={telHref(contact.phone)} className="inline-flex items-center gap-1.5 font-bold text-danger">
                <Phone className="h-4 w-4" aria-hidden="true" /> Call {contact.phone}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

import { Component } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { CRISIS_CONTACTS, telHref } from '@/lib/crisis';

// A page whose code failed to download. After a new version is published the
// old page files are gone, so a tab opened before then cannot load the next
// page it visits until it is reloaded.
const isLoadFailure = (error) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(error?.message || '');

// Without this, a page that fails to load or crashes leaves a blank screen.
// It says which happened, offers a reload, and keeps the crisis numbers in
// view, because the help page is itself a page that might not load.
export class PageErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Healing Hive page error:', error, info?.componentStack);
  }

  componentDidUpdate(previous) {
    // Moving to another address gives that page a fresh try.
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const loadFailure = isLoadFailure(error);
    return (
      <main role="alert" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
        <div className="rounded-3xl bg-danger-soft px-6 py-10 text-center">
          <CircleAlert className="mx-auto mb-3 h-8 w-8 text-danger" aria-hidden="true" />
          <h1 className="font-bold text-danger">
            {loadFailure ? "This page couldn't be downloaded" : 'This page stopped working'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loadFailure
              ? 'Healing Hive may have been updated since you opened it, or your connection dropped. Reloading gets the latest version.'
              : 'Something in this page failed while showing it. Reloading usually fixes it; nothing you saved is lost.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => window.location.reload()}>Reload the page</Button>
            <Button size="sm" variant="outline" onClick={() => window.location.assign(import.meta.env.BASE_URL)}>Go to the start</Button>
          </div>
        </div>
        <div className="rounded-3xl bg-muted px-6 py-5">
          <h2 className="mb-2 text-sm font-bold">In a crisis? Call now</h2>
          <ul className="space-y-1 text-sm">
            {CRISIS_CONTACTS.slice(0, 3).map((contact) => (
              <li key={contact.phone}>
                <span className="text-muted-foreground">{contact.name}: </span>
                <a href={telHref(contact.phone)} className="font-semibold text-danger hover:underline">{contact.phone}</a>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }
}

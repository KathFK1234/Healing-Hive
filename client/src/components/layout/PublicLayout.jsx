import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import classNames from 'classnames';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { CRISIS_CONTACTS, telHref } from '@/lib/crisis';
import { Logo, LogoMark } from './Logo';
import { HelpButton } from './HelpButton';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { to: '/therapists', label: 'Find support' },
  { to: '/nuggets', label: 'Nuggets' },
  { to: '/events', label: 'Events' },
  { to: '/professionals', label: 'For professionals' },
];

const linkClass = ({ isActive }) =>
  classNames('whitespace-nowrap rounded-full px-4 py-2 font-semibold hover:bg-muted', isActive ? 'text-primary' : 'text-foreground');

export function PublicLayout({ children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-5">
          <Logo />

          <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
            {links.map((link) => <NavLink key={link.to} to={link.to} className={linkClass}>{link.label}</NavLink>)}
          </nav>

          <div className="flex items-center gap-2">
            <HelpButton className="hidden sm:inline-flex" />
            <ThemeToggle />
            <Button to="/login" variant="outline" size="sm" className="hidden sm:inline-flex">Sign in</Button>
            <Button to="/signup" variant="honey" size="sm" className="hidden sm:inline-flex">Get started</Button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Main" className="border-t border-border xl:hidden">
            <div className="container flex flex-col gap-1 py-3">
              {links.map((link) => <NavLink key={link.to} to={link.to} className={linkClass} onClick={close}>{link.label}</NavLink>)}
              <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                <Button to="/login" variant="outline" onClick={close}>Sign in</Button>
                <Button to="/signup" variant="honey" onClick={close}>Get started</Button>
              </div>
              <HelpButton className="mt-2 justify-center sm:hidden" />
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">{children}</main>

      <footer className="mt-24 bg-muted">
        <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <LogoMark className="h-7 w-7" />
              <span className="font-bold">Healing Hive</span>
            </div>
            <p className="text-sm text-muted-foreground">Supporting Kenyan youth on their mental health journey. <em>St;ll Here.</em></p>
          </div>
          <FooterList title="Get support" items={[['Find a therapist', '/therapists'], ['Peer counsellors', '/therapists?type=peer'], ['AI companion', '/companion'], ['Events', '/events']]} />
          <FooterList title="Learn" items={[['Mental health nuggets', '/nuggets'], ['For professionals', '/professionals'], ['Sign in', '/login']]} />
          <div>
            <h2 className="mb-3 text-sm font-bold">In a crisis?</h2>
            <ul className="space-y-2 text-sm">
              {CRISIS_CONTACTS.slice(0, 2).map((contact) => (
                <li key={contact.phone}>
                  <span className="text-muted-foreground">{contact.name}: </span>
                  <a href={telHref(contact.phone)} className="font-semibold text-danger hover:underline">{contact.phone}</a>
                </li>
              ))}
            </ul>
            <Link to="/help" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">All help contacts</Link>
          </div>
        </div>
        <p className="pb-8 text-center text-sm text-muted-foreground">
          Healing Hive is not an emergency service. If you are in danger, call 999 or 112.
        </p>
      </footer>
    </div>
  );
}

function FooterList({ title, items }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      <ul className="space-y-2 text-sm">
        {items.map(([label, to]) => (
          <li key={to}><Link to={to} className="text-muted-foreground hover:text-foreground hover:underline">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

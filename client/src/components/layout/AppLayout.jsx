import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import {
  House, HeartHandshake, CalendarDays, MessageCircle, NotebookPen, Activity, Lightbulb, Bell, Ticket,
  Stethoscope, ShieldCheck, Settings, LogOut, Ellipsis, Building2, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { homePath, isApplicant, isPractitioner } from '@/lib/roles';
import { Avatar, Modal } from '@/components/ui';
import { Logo } from './Logo';
import { HelpButton } from './HelpButton';
import { ThemeToggle } from './ThemeToggle';

const learn = {
  label: 'Learn',
  items: [
    { to: '/nuggets', label: 'Nuggets', icon: Lightbulb },
    { to: '/events', label: 'Events', icon: Ticket },
  ],
};

// The menu is short and grouped, and depends on who is signed in: someone
// looking for support, a professional, an institution or an admin.
function menuFor(user) {
  if (user.role === 'admin') {
    return [
      { items: [{ to: '/admin', label: 'Admin', icon: ShieldCheck }, { to: '/therapists', label: 'Directory', icon: HeartHandshake }] },
      learn,
    ];
  }
  if (isPractitioner(user)) {
    return [{ items: [{ to: '/practice', label: 'My practice', icon: Stethoscope }] }, learn];
  }
  if (user.role === 'institution') {
    return [{ items: [{ to: '/institution', label: 'My institution', icon: Building2 }] }, learn];
  }
  if (isApplicant(user)) {
    return [{ items: [{ to: '/apply', label: 'My application', icon: ClipboardList }] }, learn];
  }
  return [
    { items: [{ to: '/home', label: 'Home', icon: House }] },
    {
      label: 'Talk to someone',
      items: [
        { to: '/therapists', label: 'Find support', icon: HeartHandshake },
        { to: '/sessions', label: 'My sessions', icon: CalendarDays },
        { to: '/companion', label: 'AI companion', icon: MessageCircle },
      ],
    },
    {
      label: 'For you',
      items: [
        { to: '/journal', label: 'Journal', icon: NotebookPen },
        { to: '/mood', label: 'Mood', icon: Activity },
        { to: '/reminders', label: 'Reminders', icon: Bell },
      ],
    },
    learn,
  ];
}

// The phone's bottom bar holds the first four destinations; the rest sit under "More".
const CLIENT_TABS = ['/home', '/therapists', '/companion', '/journal'];

// Shorter names so they fit under an icon on a narrow phone
const SHORT_LABELS = {
  'Find support': 'Support', 'AI companion': 'Companion', 'My practice': 'Practice',
  'My institution': 'Institution', 'My application': 'Application',
};

const sideLink = ({ isActive }) =>
  classNames(
    'flex h-12 items-center gap-3 rounded-2xl px-4 font-semibold transition-colors',
    isActive ? 'bg-primary-soft text-primary' : 'text-foreground hover:bg-muted',
  );

const tabLink = ({ isActive }) =>
  classNames('flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold', isActive ? 'text-primary' : 'text-muted-foreground');

export function AppLayout({ children }) {
  const { user, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const groups = menuFor(user);
  const all = groups.flatMap((group) => group.items);
  const isClient = all.some((item) => item.to === '/home');
  const tabs = isClient ? CLIENT_TABS.map((to) => all.find((item) => item.to === to)) : all.slice(0, 4);
  const overflow = all.filter((item) => !tabs.includes(item));

  return (
    <div className="min-h-screen lg:pl-72">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-20 items-center px-7"><Logo to={homePath(user)} /></div>
        <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {groups.map((group, index) => (
            <div key={group.label || index}>
              {group.label && <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>}
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className={sideLink}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-1 p-4">
          <NavLink to="/settings" className={(state) => classNames(sideLink(state), 'h-16')}>
            <Avatar name={user.fullName} size="sm" />
            <span className="min-w-0">
              <span className="block truncate">{user.fullName}</span>
              <span className="block text-xs font-medium text-muted-foreground">Settings</span>
            </span>
          </NavLink>
          <button type="button" onClick={signOut} className={classNames(sideLink({ isActive: false }), 'w-full')}>
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="flex h-20 items-center justify-between gap-3 px-5 lg:px-12">
          <div className="lg:hidden"><Logo to={homePath(user)} /></div>
          <div className="ml-auto flex items-center gap-2">
            <HelpButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl px-5 pb-36 pt-4 lg:px-12 lg:pb-24 lg:pt-8">{children}</main>

      {/* Phone bottom bar */}
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card lg:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={tabLink}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              {SHORT_LABELS[label] || label}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMoreOpen(true)} className={tabLink({ isActive: false })}>
            <Ellipsis className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <nav aria-label="More" className="grid gap-1 pb-2 sm:grid-cols-2">
          {overflow.concat({ to: '/settings', label: 'Settings', icon: Settings }).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className={sideLink}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <button type="button" onClick={signOut} className={sideLink({ isActive: false })}>
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign out
          </button>
        </nav>
      </Modal>
    </div>
  );
}

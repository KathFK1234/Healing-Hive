import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import {
  House, HeartHandshake, CalendarDays, MessageCircle, NotebookPen, Activity, Lightbulb, Bell, Ticket,
  Stethoscope, ShieldCheck, Settings, LogOut, Ellipsis,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Modal } from '@/components/ui';
import { Logo } from './Logo';
import { HelpButton } from './HelpButton';
import { ThemeToggle } from './ThemeToggle';

const mainItems = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/therapists', label: 'Find support', icon: HeartHandshake },
  { to: '/sessions', label: 'My sessions', icon: CalendarDays },
  { to: '/companion', label: 'AI companion', icon: MessageCircle },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/mood', label: 'Mood', icon: Activity },
  { to: '/nuggets', label: 'Nuggets', icon: Lightbulb },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/events', label: 'Events', icon: Ticket },
];

// The four destinations people use most sit in the phone's bottom bar;
// everything else is one tap away under "More".
const tabItems = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/therapists', label: 'Support', icon: HeartHandshake },
  { to: '/companion', label: 'Companion', icon: MessageCircle },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
];

function itemsFor(user) {
  const items = [...mainItems];
  if (user.role === 'therapist' || user.role === 'peer') {
    items.push({ to: '/practice', label: 'My practice', icon: Stethoscope });
  }
  if (user.role === 'admin') items.push({ to: '/admin', label: 'Admin', icon: ShieldCheck });
  return items;
}

const sideLink = ({ isActive }) =>
  classNames(
    'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors',
    isActive ? 'bg-primary-soft text-primary' : 'text-foreground hover:bg-muted',
  );

export function AppLayout({ children }) {
  const { user, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = itemsFor(user);


  return (
    <div className="min-h-screen lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center px-5"><Logo to="/home" /></div>
        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={sideLink}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <NavLink to="/settings" className={(state) => classNames(sideLink(state), 'h-14')}>
            <Avatar name={user.fullName} size="sm" />
            <span className="min-w-0">
              <span className="block truncate">{user.fullName}</span>
              <span className="block text-xs font-semibold text-muted-foreground">Settings</span>
            </span>
          </NavLink>
          <button type="button" onClick={signOut} className={classNames(sideLink({ isActive: false }), 'w-full')}>
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
          <div className="lg:hidden"><Logo to="/home" /></div>
          <div className="ml-auto flex items-center gap-2">
            <HelpButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 lg:px-8 lg:pb-12">{children}</main>

      {/* Phone bottom bar */}
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card lg:hidden">
        <div className="grid grid-cols-5">
          {tabItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => classNames('flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold', isActive ? 'text-primary' : 'text-muted-foreground')}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold text-muted-foreground"
          >
            <Ellipsis className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <nav aria-label="More" className="grid grid-cols-2 gap-2">
          {items.filter((item) => !tabItems.some((tab) => tab.to === item.to)).concat({ to: '/settings', label: 'Settings', icon: Settings }).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className={sideLink}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <button type="button" onClick={signOut} className={classNames(sideLink({ isActive: false }), 'col-span-2')}>
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign out
          </button>
        </nav>
      </Modal>
    </div>
  );
}

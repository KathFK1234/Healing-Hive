import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui';
import { Logo } from '@/components/layout/Logo';
import { HelpButton } from '@/components/layout/HelpButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// The frame around the sign in and sign up forms.
export function AuthShell({ title, description, children, footer, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col bg-honey-soft/50">
      <header className="container flex h-20 items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
        </Link>
        <div className="flex items-center gap-2">
          <HelpButton />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center">
        <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}>
          <div className="mb-8 flex justify-center"><Logo /></div>
          <Card className="sm:p-10">
            <h1 className="text-3xl">{title}</h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
            <div className="mt-8">{children}</div>
          </Card>
          <div className="mt-6 space-y-2 text-center text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  );
}

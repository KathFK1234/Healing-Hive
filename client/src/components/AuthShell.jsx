import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui';
import { Logo } from '@/components/layout/Logo';
import { HelpButton } from '@/components/layout/HelpButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// The frame around the sign in and sign up forms.
export function AuthShell({ title, description, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-honey-soft/60 to-background">
      <header className="container flex h-16 items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
        </Link>
        <div className="flex items-center gap-2">
          <HelpButton />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <Card className="p-6 sm:p-8">
            <h1 className="text-2xl">{title}</h1>
            <p className="mt-1 text-muted-foreground">{description}</p>
            <div className="mt-6">{children}</div>
          </Card>
          <div className="mt-5 space-y-2 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  );
}

import classNames from 'classnames';
import { Loader2, CircleAlert } from 'lucide-react';
import { Button } from './Button';

const tones = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-primary-soft text-primary',
  honey: 'bg-honey-soft text-honey-foreground dark:text-honey',
  calm: 'bg-calm-soft text-calm',
  warmth: 'bg-warmth-soft text-warmth',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={classNames('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', tones[tone], className)}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

// Initials on a soft colour. Nobody's photo is needed, and none is stored.
export function Avatar({ name = '', size = 'md', className }) {
  const initials = name
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter((part) => /^[a-z]/i.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  const sizes = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-base', lg: 'h-20 w-20 text-2xl' };
  return (
    <span
      aria-hidden="true"
      className={classNames('inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary', sizes[size], className)}
    >
      {initials || '?'}
    </span>
  );
}

export function Spinner({ label = 'Loading', className }) {
  return (
    <div role="status" className={classNames('flex items-center justify-center gap-2 py-10 text-muted-foreground', className)}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="rounded-3xl bg-muted px-6 py-14 text-center">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />}
      <p className="font-bold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-3xl bg-danger-soft px-6 py-12 text-center">
      <CircleAlert className="mx-auto mb-3 h-8 w-8 text-danger" aria-hidden="true" />
      <p className="font-bold text-danger">{error?.message || 'Something went wrong'}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

// Wraps the three states every data-loading block has.
export function QueryState({ query, loadingLabel, children }) {
  if (query.isPending) return <Spinner label={loadingLabel} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  return children(query.data);
}

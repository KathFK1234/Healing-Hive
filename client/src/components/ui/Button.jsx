import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors ' +
  'disabled:opacity-60 disabled:cursor-not-allowed select-none';

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  honey: 'bg-honey text-honey-foreground hover:bg-honey/90',
  outline: 'border border-border bg-card text-foreground hover:bg-muted',
  soft: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
  ghost: 'text-foreground hover:bg-muted',
  danger: 'bg-danger text-white dark:text-background hover:bg-danger/90',
};

// 44px is the smallest comfortable touch target, so `md` is the default.
const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

// Renders a <button>, or a router <Link> when `to` is given.
export function Button({ variant = 'primary', size = 'md', loading = false, to, className, children, ...props }) {
  const classes = classNames(base, variants[variant], sizes[size], className);

  if (to) {
    return <Link to={to} className={classes} {...props}>{children}</Link>;
  }
  return (
    <button type="button" className={classes} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

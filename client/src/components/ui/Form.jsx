import { useId } from 'react';
import classNames from 'classnames';

const control =
  'w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground ' +
  'placeholder:text-muted-foreground/70 focus-visible:ring-offset-0 disabled:opacity-60';

// Label, control, hint and error wired together for screen readers.
// The child is a function so it can receive the generated ids.
export function Field({ label, hint, error, children, className }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={classNames('space-y-2', className)}>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && <p id={`${id}-hint`} className="text-sm text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={classNames(control, 'h-12', className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }) {
  return <textarea rows={rows} className={classNames(control, 'py-3 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return <select className={classNames(control, 'h-12 pr-8', className)} {...props}>{children}</select>;
}

// A pill that toggles on and off. Used for filters and multi-choice lists.
export function Chip({ selected, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={classNames(
        'inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Pick any number of options from a list of chips.
export function ChipGroup({ label, options, value, onChange }) {
  const toggle = (option) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip key={option} selected={value.includes(option)} onClick={() => toggle(option)}>{option}</Chip>
        ))}
      </div>
    </fieldset>
  );
}

// Shows a failed request's message above a form.
export function FormError({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-2xl bg-danger-soft px-5 py-4 text-sm font-semibold text-danger">
      {error.message || String(error)}
    </p>
  );
}

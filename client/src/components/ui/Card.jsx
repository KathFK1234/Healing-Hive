import classNames from 'classnames';

export function Card({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag className={classNames('rounded-2xl border border-border bg-card p-5 shadow-soft', className)} {...props}>
      {children}
    </Tag>
  );
}

// A titled block on a page, with an optional action on the right.
export function Section({ title, icon: Icon, action, children, className }) {
  return (
    <section className={classNames('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg">
          {Icon && <Icon className="h-5 w-5 text-primary" aria-hidden="true" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}

import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { LifeBuoy } from 'lucide-react';

// On every page, signed in or not: one tap to the crisis contacts.
export function HelpButton({ className }) {
  return (
    <Link
      to="/help"
      className={classNames(
        'inline-flex h-10 items-center gap-2 rounded-full bg-danger-soft px-3.5 text-sm font-extrabold text-danger hover:bg-danger hover:text-white dark:hover:text-background',
        className,
      )}
    >
      <LifeBuoy className="h-4 w-4" aria-hidden="true" />
      Get help now
    </Link>
  );
}

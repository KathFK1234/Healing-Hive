import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { LifeBuoy } from 'lucide-react';

// On every page, signed in or not: one tap to the crisis contacts.
export function HelpButton({ className }) {
  return (
    <Link
      to="/help"
      className={classNames(
        'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-danger-soft px-4 text-sm font-bold text-danger hover:bg-danger hover:text-white dark:hover:text-background',
        className,
      )}
    >
      <LifeBuoy className="h-4 w-4" aria-hidden="true" />
      {/* shorter on narrow phones, where the logo needs the room */}
      <span className="min-[400px]:hidden">Get help</span>
      <span className="max-[399px]:hidden">Get help now</span>
    </Link>
  );
}

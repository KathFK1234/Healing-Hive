import { Link } from 'react-router-dom';

export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25z" className="fill-honey" />
      <path d="M16 22.2s-5.4-3.3-5.4-7.1a2.9 2.9 0 0 1 5.4-1.5 2.9 2.9 0 0 1 5.4 1.5c0 3.8-5.4 7.1-5.4 7.1z" className="fill-honey-foreground" />
    </svg>
  );
}

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-lg" aria-label="Healing Hive home">
      <LogoMark />
      <span className="leading-none">
        <span className="block text-lg font-extrabold tracking-tight">Healing Hive</span>
        <span className="block text-xs italic text-muted-foreground">St;ll Here</span>
      </span>
    </Link>
  );
}

import classNames from 'classnames';
import { Star } from 'lucide-react';

// Shows a rating out of five. With `onChange` it becomes a control for giving one.
export function Stars({ value = 0, onChange, size = 'sm' }) {
  const dimension = size === 'lg' ? 'h-9 w-9' : 'h-4 w-4';
  const star = (position) => (
    <Star
      className={classNames(dimension, position <= Math.round(value) ? 'fill-honey text-honey' : 'text-border')}
      aria-hidden="true"
    />
  );

  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((position) => <span key={position}>{star(position)}</span>)}
      </span>
    );
  }
  return (
    <div role="radiogroup" aria-label="Your rating" className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((position) => (
        <button
          key={position}
          type="button"
          role="radio"
          aria-checked={value === position}
          aria-label={`${position} ${position === 1 ? 'star' : 'stars'}`}
          onClick={() => onChange(position)}
          className="rounded-lg p-1"
        >
          {star(position)}
        </button>
      ))}
    </div>
  );
}

// "4.6 (12 reviews)", or a gentle "New" for someone without any yet.
export function RatingSummary({ average, count }) {
  if (!count) return <span className="text-sm text-muted-foreground">New on Healing Hive</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Star className="h-4 w-4 fill-honey text-honey" aria-hidden="true" />
      <span className="font-bold">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">({count} {count === 1 ? 'review' : 'reviews'})</span>
    </span>
  );
}

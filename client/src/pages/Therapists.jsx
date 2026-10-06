import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, BadgeCheck, CalendarClock, HeartHandshake, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { PROFESSIONAL_TYPES } from '@/lib/options';
import { Avatar, Badge, Button, Card, Chip, EmptyState, Input, PageHeader, QueryState, Select } from '@/components/ui';
import { RatingSummary } from '@/components/Stars';
import { usePageTitle } from '@/hooks/usePageTitle';

const typeChoices = [
  { value: '', label: 'Everyone' },
  { value: 'therapist', label: 'Therapists' },
  { value: 'peer', label: 'Peer counsellors' },
];

const Therapists = () => {
  usePageTitle('Find support');
  // Filters live in the address bar, so a search can be shared or bookmarked
  // and the back button behaves.
  const [params, setParams] = useSearchParams();
  const filters = {
    q: params.get('q') || '',
    type: params.get('type') || '',
    specialty: params.get('specialty') || '',
    language: params.get('language') || '',
    sort: params.get('sort') || 'soonest',
    page: Number(params.get('page')) || 1,
  };
  const extraFilters = Boolean(filters.specialty || filters.language || filters.sort !== 'soonest');
  const [showMore, setShowMore] = useState(extraFilters);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // The search box updates the address a moment after typing stops.
  const [search, setSearch] = useState(filters.q);
  useEffect(() => {
    if (search === filters.q) return undefined;
    const timer = setTimeout(() => setFilter('q', search.trim()), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const options = useQuery({ queryKey: ['professionals', 'filters'], queryFn: () => api.get('/professionals/filters'), staleTime: 10 * 60 * 1000 });
  const list = useQuery({
    queryKey: ['professionals', filters],
    queryFn: () => api.get('/professionals', filters),
    placeholderData: keepPreviousData,
  });

  const hasFilters = filters.q || filters.type || filters.specialty || filters.language;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Find the right person to talk to"
        description="Everyone here has been checked by Healing Hive."
      />

      <div className="mb-10 space-y-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-5 top-4 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Search by name, town or what you need help with"
            placeholder="Search by name, town or what you need help with"
            className="h-14 rounded-full pl-14"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Kind of support">
            {typeChoices.map((choice) => (
              <Chip key={choice.value} selected={filters.type === choice.value} onClick={() => setFilter('type', choice.value)}>{choice.label}</Chip>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={showMore}
            aria-controls="more-filters"
            onClick={() => setShowMore(!showMore)}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary hover:bg-primary-soft"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {showMore ? 'Fewer filters' : 'More filters'}
          </button>
        </div>

        {showMore && (
          <div id="more-filters" className="grid gap-3 sm:grid-cols-3">
            <Select aria-label="What you want help with" value={filters.specialty} onChange={(event) => setFilter('specialty', event.target.value)}>
              <option value="">Any topic</option>
              {options.data?.specialties.map((specialty) => <option key={specialty}>{specialty}</option>)}
            </Select>
            <Select aria-label="Language" value={filters.language} onChange={(event) => setFilter('language', event.target.value)}>
              <option value="">Any language</option>
              {options.data?.languages.map((language) => <option key={language}>{language}</option>)}
            </Select>
            <Select aria-label="Sort by" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value === 'soonest' ? '' : event.target.value)}>
              <option value="soonest">Soonest available</option>
              <option value="rating">Highest rated</option>
              <option value="price">Lowest price</option>
              <option value="experience">Most experience</option>
            </Select>
          </div>
        )}
      </div>

      <QueryState query={list} loadingLabel="Finding people who can help">
        {(data) => data.items.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title={hasFilters ? 'Nobody matches those filters yet' : 'No professionals are listed yet'}
            action={hasFilters && <Button variant="outline" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>Clear filters</Button>}
          >
            {hasFilters ? 'Try removing a filter or searching for something broader.' : 'We are verifying our first professionals. Please check back soon.'}
          </EmptyState>
        ) : (
          <>
            <p className="mb-5 text-muted-foreground" aria-live="polite">
              {data.total} {data.total === 1 ? 'person' : 'people'} available
            </p>
            <ul className="space-y-5">
              {data.items.map((professional) => (
                <li key={professional._id}><ProfessionalCard professional={professional} /></li>
              ))}
            </ul>
            {data.pages > 1 && (
              <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-4">
                <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setFilter('page', String(data.page - 1))}>Previous</Button>
                <span className="text-muted-foreground">Page {data.page} of {data.pages}</span>
                <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setFilter('page', String(data.page + 1))}>Next</Button>
              </nav>
            )}
          </>
        )}
      </QueryState>
    </div>
  );
};

// Deliberately short: who they are, what they help with, what it costs and
// when they are next free. Everything else is on their profile.
function ProfessionalCard({ professional }) {
  const { user, type, title, specialties, languages, location, rate, nextAvailable, ratingAverage, ratingCount } = professional;
  return (
    <Card>
      <div className="flex items-start gap-5">
        <Avatar name={user?.fullName} size="lg" className="hidden sm:inline-flex" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-xl">{user?.fullName}</h2>
            <Badge tone="primary" icon={BadgeCheck}>Verified</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {[title || PROFESSIONAL_TYPES[type], location].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-2"><RatingSummary average={ratingAverage} count={ratingCount} /></p>

          {specialties.length > 0 && (
            <p className="mt-4">
              <span className="text-muted-foreground">Helps with </span>
              {specialties.slice(0, 4).join(', ')}
            </p>
          )}
          {languages.length > 0 && (
            <p><span className="text-muted-foreground">Speaks </span>{languages.join(', ')}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <div>
          <p className="text-lg font-bold">{formatMoney(rate?.amount, rate?.currency)} <span className="text-base font-medium text-muted-foreground">per session</span></p>
          <p className="mt-1 flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {nextAvailable ? `Next free ${formatDateTime(nextAvailable)}` : 'No open times right now'}
          </p>
        </div>
        <Button to={`/therapists/${professional._id}`}>View and book</Button>
      </div>
    </Card>
  );
}

export default Therapists;

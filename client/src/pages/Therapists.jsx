import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, MapPin, Clock, Languages, BadgeCheck, CalendarClock, HeartHandshake } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { PROFESSIONAL_TYPES } from '@/lib/options';
import { Avatar, Badge, Button, Card, Chip, EmptyState, Input, PageHeader, QueryState, Select } from '@/components/ui';
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
    <>
      <PageHeader
        title="Find the right support"
        description="Everyone listed here has been checked by Healing Hive. Filter by what you want help with, then book an open time."
      />

      <Card className="mb-6 space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Search by name, town or what you need help with"
            placeholder="Search by name, town or what you need help with"
            className="pl-11"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Kind of support">
          {typeChoices.map((choice) => (
            <Chip key={choice.value} selected={filters.type === choice.value} onClick={() => setFilter('type', choice.value)}>{choice.label}</Chip>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Select aria-label="What you want help with" value={filters.specialty} onChange={(event) => setFilter('specialty', event.target.value)}>
            <option value="">Any topic</option>
            {options.data?.specialties.map((specialty) => <option key={specialty}>{specialty}</option>)}
          </Select>
          <Select aria-label="Language" value={filters.language} onChange={(event) => setFilter('language', event.target.value)}>
            <option value="">Any language</option>
            {options.data?.languages.map((language) => <option key={language}>{language}</option>)}
          </Select>
          <Select aria-label="Sort by" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
            <option value="soonest">Soonest available</option>
            <option value="price">Lowest price</option>
            <option value="experience">Most experience</option>
          </Select>
        </div>
      </Card>

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
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              {data.total} {data.total === 1 ? 'person' : 'people'} available
            </p>
            <ul className="grid gap-4 md:grid-cols-2">
              {data.items.map((professional) => (
                <li key={professional._id}><ProfessionalCard professional={professional} /></li>
              ))}
            </ul>
            {data.pages > 1 && (
              <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setFilter('page', String(data.page - 1))}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {data.page} of {data.pages}</span>
                <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setFilter('page', String(data.page + 1))}>Next</Button>
              </nav>
            )}
          </>
        )}
      </QueryState>
    </>
  );
};

function ProfessionalCard({ professional }) {
  const { user, type, title, specialties, languages, location, yearsExperience, rate, nextAvailable, bio } = professional;
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <Avatar name={user?.fullName} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg">{user?.fullName}</h2>
          <p className="text-sm text-muted-foreground">{title || PROFESSIONAL_TYPES[type]}</p>
        </div>
        <Badge tone="primary" icon={BadgeCheck}>Verified</Badge>
      </div>

      {specialties.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Helps with">
          {specialties.slice(0, 4).map((specialty) => <li key={specialty}><Badge>{specialty}</Badge></li>)}
        </ul>
      )}

      {bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{bio}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {location && <Fact icon={MapPin} label="Based in">{location}</Fact>}
        {yearsExperience > 0 && <Fact icon={Clock} label="Experience">{yearsExperience} {yearsExperience === 1 ? 'year' : 'years'}</Fact>}
        {languages.length > 0 && <Fact icon={Languages} label="Languages" wide>{languages.join(', ')}</Fact>}
      </dl>

      <div className="mt-auto pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className="text-lg font-extrabold">{formatMoney(rate?.amount, rate?.currency)}<span className="text-sm font-semibold text-muted-foreground"> / session</span></p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {nextAvailable ? `Next: ${formatDateTime(nextAvailable)}` : 'No open times right now'}
          </p>
        </div>
        <Button to={`/therapists/${professional._id}`}>View and book</Button>
      </div>
      </div>
    </Card>
  );
}

function Fact({ icon: Icon, label, wide, children }) {
  return (
    <div className={wide ? 'col-span-2 flex items-center gap-2' : 'flex items-center gap-2'}>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}

export default Therapists;

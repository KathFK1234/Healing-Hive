import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, Building2, MapPin, Clock, Languages, Video, Phone, CalendarX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatDay, formatLongDate, formatMoney, formatTime, localDay } from '@/lib/format';
import { PROFESSIONAL_TYPES } from '@/lib/options';
import { Avatar, Badge, Button, Card, Chip, EmptyState, Field, FormError, QueryState, Textarea, useToast } from '@/components/ui';
import { RatingSummary, Stars } from '@/components/Stars';
import { usePageTitle } from '@/hooks/usePageTitle';

const modes = [
  { value: 'video', label: 'Video call', icon: Video },
  { value: 'audio', label: 'Voice call', icon: Phone },
];

const TherapistProfile = () => {
  const { id } = useParams();
  const query = useQuery({ queryKey: ['professional', id], queryFn: () => api.get(`/professionals/${id}`) });
  usePageTitle(query.data?.user?.fullName || 'Profile');

  return (
    <>
      <Link to="/therapists" className="mb-8 inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All professionals
      </Link>
      <QueryState query={query}>
        {(professional) => (
          <div className="mx-auto max-w-2xl space-y-8">
            <About professional={professional} />
            <Booking professional={professional} />
            <Reviews professional={professional} />
          </div>
        )}
      </QueryState>
    </>
  );
};

function About({ professional }) {
  const { user, type, title, bio, specialties, languages, location, yearsExperience, institution, ratingAverage, ratingCount } = professional;
  return (
    <Card>
      <div className="flex items-center gap-5">
        <Avatar name={user?.fullName} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl">{user?.fullName}</h1>
          <p className="text-muted-foreground">{title || PROFESSIONAL_TYPES[type]}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Badge tone="primary" icon={BadgeCheck}>Verified by Healing Hive</Badge>
            <RatingSummary average={ratingAverage} count={ratingCount} />
          </div>
        </div>
      </div>

      {bio && <p className="mt-6 whitespace-pre-line">{bio}</p>}

      {specialties.length > 0 && (
        <>
          <h2 className="mt-6 text-base">Helps with</h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {specialties.map((specialty) => <li key={specialty}><Badge>{specialty}</Badge></li>)}
          </ul>
        </>
      )}

      <ul className="mt-6 space-y-3">
        {institution && <li className="flex items-center gap-3"><Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Part of {institution.organisationName}</li>}
        {location && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {location}</li>}
        {yearsExperience > 0 && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {yearsExperience} {yearsExperience === 1 ? 'year' : 'years'} of experience</li>}
        {languages.length > 0 && <li className="flex items-center gap-2"><Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {languages.join(', ')}</li>}
      </ul>
    </Card>
  );
}

function Booking({ professional }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Open times grouped by calendar day: pick a day first, then a time.
  const days = useMemo(() => {
    const grouped = new Map();
    for (const slot of professional.slots) {
      const key = localDay(slot);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(slot);
    }
    return [...grouped.entries()];
  }, [professional.slots]);

  const [day, setDay] = useState(days[0]?.[0]);
  const [slot, setSlot] = useState(null);
  const [mode, setMode] = useState('video');
  const [note, setNote] = useState('');
  const times = days.find(([key]) => key === day)?.[1] || [];

  const book = useMutation({
    mutationFn: () => api.post('/sessions', { professionalId: professional._id, scheduledAt: slot, mode, clientNote: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['professional', professional._id] });
      toast('Session requested');
      navigate('/sessions');
    },
    // Someone else took the time: reload the open times and let them re-pick.
    onError: (error) => {
      if (error.status === 409) {
        setSlot(null);
        queryClient.invalidateQueries({ queryKey: ['professional', professional._id] });
      }
    },
  });

  const isOwnProfile = user && professional.user?._id === user._id;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl">Book a session</h2>
        <p className="font-bold">
          {formatMoney(professional.rate?.amount, professional.rate?.currency)}
          <span className="text-sm font-semibold text-muted-foreground"> · {professional.sessionMinutes} minutes</span>
        </p>
      </div>

      {days.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={CalendarX} title="No open times in the next two weeks" action={<Button to="/therapists" variant="outline">See other professionals</Button>}>
            Their calendar is full for now. Check back later, or pick someone else.
          </EmptyState>
        </div>
      ) : (
        <form
          className="mt-8 space-y-8"
          onSubmit={(event) => { event.preventDefault(); book.mutate(); }}
        >
          <fieldset>
            <legend className="mb-3 font-semibold">1. Pick a day</legend>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              {days.map(([key, slots]) => (
                <Chip key={key} selected={key === day} onClick={() => { setDay(key); setSlot(null); }} className="shrink-0">
                  {formatDay(slots[0])}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 font-semibold">2. Pick a time <span className="font-medium text-muted-foreground">(East Africa Time)</span></legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {times.map((time) => (
                <Chip key={time} selected={time === slot} onClick={() => setSlot(time)} className="justify-center">{formatTime(time)}</Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 font-semibold">3. How would you like to meet?</legend>
            <div className="flex flex-wrap gap-2">
              {modes.map(({ value, label, icon: Icon }) => (
                <Chip key={value} selected={mode === value} onClick={() => setMode(value)}>
                  <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />{label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <Field label="Anything you'd like them to know first? (optional)" hint="Only you and this professional can read this.">
            {(field) => <Textarea {...field} rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />}
          </Field>

          <FormError error={book.error} />

          <div className="rounded-2xl bg-muted p-5">
            {slot
              ? <p><strong>{formatLongDate(slot)}</strong> at <strong>{formatTime(slot)}</strong> with {professional.user?.fullName}.</p>
              : <p className="text-muted-foreground">Pick a day and a time to continue.</p>}
            <p className="mt-1 text-muted-foreground">
              You won't be charged now: online payment is not available yet. Once they accept, we'll email you a link to join.
            </p>
          </div>

          {isOwnProfile ? (
            <p className="text-sm text-muted-foreground">This is your own profile. This is how it looks to people booking you.</p>
          ) : user ? (
            <Button type="submit" size="lg" className="w-full" disabled={!slot} loading={book.isPending}>Request this session</Button>
          ) : (
            <Button to="/login" state={{ from: location.pathname }} size="lg" className="w-full">Sign in to book</Button>
          )}
        </form>
      )}
    </Card>
  );
}

function Reviews({ professional }) {
  const query = useQuery({
    queryKey: ['professional', professional._id, 'reviews'],
    queryFn: () => api.get(`/professionals/${professional._id}/reviews`),
    enabled: professional.ratingCount > 0,
  });
  if (!professional.ratingCount || !query.data?.length) return null;

  return (
    <Card>
      <h2 className="text-2xl">What people say</h2>
      <p className="mt-1 text-muted-foreground">Reviews are from people who completed a session, and are shown without names.</p>
      <ul className="mt-6 divide-y divide-border">
        {query.data.map((review) => (
          <li key={review._id} className="py-5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <Stars value={review.rating} />
              <span className="text-sm text-muted-foreground">{formatDate(review.createdAt)}</span>
            </div>
            {review.comment && <p className="mt-2">{review.comment}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default TherapistProfile;

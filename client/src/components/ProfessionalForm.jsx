import { useState } from 'react';
import { DAY_NAMES, clockToMinutes, minutesToClock } from '@/lib/format';
import { LANGUAGES, PROFESSIONAL_TYPES, SPECIALTIES } from '@/lib/options';
import { Button, ChipGroup, Field, FormError, Input, Select, Textarea } from '@/components/ui';

// Monday first, the way a working week is usually read
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// The form edits one block of hours per day. (The server can store several
// blocks per day; if that is ever needed, this is the place to extend.)
function toFormHours(availability = []) {
  return DAY_ORDER.map((day) => {
    const window = availability.find((entry) => entry.day === day);
    return {
      day,
      on: !!window,
      start: minutesToClock(window?.start ?? 9 * 60),
      end: minutesToClock(window?.end ?? 17 * 60),
    };
  });
}

function toFormValues(profile) {
  return {
    type: profile?.type || 'therapist',
    licenseNumber: profile?.licenseNumber || '',
    title: profile?.title || '',
    bio: profile?.bio || '',
    specialties: profile?.specialties || [],
    languages: profile?.languages?.length ? profile.languages : ['English'],
    location: profile?.location || '',
    yearsExperience: profile?.yearsExperience ?? '',
    amount: profile?.rate?.amount ?? '',
    sessionMinutes: profile?.sessionMinutes || 50,
    hours: toFormHours(profile?.availability),
  };
}

// Used both to apply (`mode="apply"`) and to edit an approved profile, where the
// kind of professional and the licence number can no longer be changed.
export function ProfessionalForm({ profile, mode, mutation, submitLabel }) {
  const [form, setForm] = useState(() => toFormValues(profile));
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const setHours = (day, changes) =>
    setForm({ ...form, hours: form.hours.map((entry) => (entry.day === day ? { ...entry, ...changes } : entry)) });

  const applying = mode === 'apply';
  const invalidHours = form.hours.some((entry) => entry.on && clockToMinutes(entry.end) <= clockToMinutes(entry.start));

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate({
      ...(applying && { type: form.type, licenseNumber: form.licenseNumber || undefined }),
      title: form.title,
      bio: form.bio,
      specialties: form.specialties,
      languages: form.languages,
      location: form.location,
      yearsExperience: form.yearsExperience === '' ? undefined : Number(form.yearsExperience),
      rate: { amount: Number(form.amount) || 0 },
      sessionMinutes: Number(form.sessionMinutes),
      availability: form.hours.filter((entry) => entry.on).map((entry) => ({
        day: entry.day,
        start: clockToMinutes(entry.start),
        end: clockToMinutes(entry.end),
      })),
    });
  };

  return (
    <form className="space-y-8" onSubmit={submit}>
      <section className="space-y-4">
        <h2 className="text-lg">About you</h2>
        {applying && (
          <>
            <Field label="I am applying as">
              {(field) => (
                <Select {...field} value={form.type} onChange={set('type')}>
                  {Object.entries(PROFESSIONAL_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              )}
            </Field>
            {form.type === 'therapist' && (
              <Field label="Licence number" hint="Used only to verify you. It is never shown publicly.">
                {(field) => <Input {...field} required maxLength={60} value={form.licenseNumber} onChange={set('licenseNumber')} />}
              </Field>
            )}
          </>
        )}
        <Field label="Professional title" hint="For example: Counselling Psychologist">
          {(field) => <Input {...field} maxLength={80} value={form.title} onChange={set('title')} />}
        </Field>
        <Field label="Bio" hint="Tell people about your approach and experience. This appears on your public profile.">
          {(field) => <Textarea {...field} rows={5} maxLength={1500} value={form.bio} onChange={set('bio')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Town or city">
            {(field) => <Input {...field} maxLength={80} value={form.location} onChange={set('location')} />}
          </Field>
          <Field label="Years of experience">
            {(field) => <Input {...field} type="number" min={0} max={70} value={form.yearsExperience} onChange={set('yearsExperience')} />}
          </Field>
        </div>
        <ChipGroup label="What do you help with?" options={SPECIALTIES} value={form.specialties} onChange={(specialties) => setForm({ ...form, specialties })} />
        <ChipGroup label="Languages you work in" options={LANGUAGES} value={form.languages} onChange={(languages) => setForm({ ...form, languages })} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg">Sessions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price per session (KSh)" hint="Enter 0 if you offer sessions for free.">
            {(field) => <Input {...field} type="number" min={0} required value={form.amount} onChange={set('amount')} />}
          </Field>
          <Field label="Session length (minutes)">
            {(field) => <Input {...field} type="number" min={15} max={180} required value={form.sessionMinutes} onChange={set('sessionMinutes')} />}
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg">Weekly hours</h2>
          <p className="text-sm text-muted-foreground">People can book back-to-back sessions inside these hours, in East Africa Time.</p>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {form.hours.map((entry) => (
            <li key={entry.day} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <label className="flex w-36 items-center gap-3 font-bold">
                <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={entry.on} onChange={(event) => setHours(entry.day, { on: event.target.checked })} />
                {DAY_NAMES[entry.day]}
              </label>
              {entry.on ? (
                <div className="flex items-center gap-2">
                  <Input type="time" aria-label={`${DAY_NAMES[entry.day]} start`} className="w-32" value={entry.start} onChange={(event) => setHours(entry.day, { start: event.target.value })} />
                  <span className="text-muted-foreground">to</span>
                  <Input type="time" aria-label={`${DAY_NAMES[entry.day]} end`} className="w-32" value={entry.end} onChange={(event) => setHours(entry.day, { end: event.target.value })} />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Not available</span>
              )}
            </li>
          ))}
        </ul>
        {invalidHours && <p className="text-sm font-semibold text-danger">Each day's end time must be after its start time.</p>}
      </section>

      <FormError error={mutation.error} />
      <Button type="submit" size="lg" loading={mutation.isPending} disabled={invalidHours}>{submitLabel}</Button>
    </form>
  );
}

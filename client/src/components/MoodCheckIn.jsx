import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import { api } from '@/lib/api';
import { MOODS, MOOD_TAGS } from '@/lib/moods';
import { Button, ChipGroup, Field, FormError, Textarea, useToast } from '@/components/ui';

// One tap records how you feel. The note and tags are optional extras that only
// appear after a mood is picked, so the quick path stays quick.
export function MoodCheckIn({ onDone }) {
  const [score, setScore] = useState(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState([]);
  const toast = useToast();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => api.post('/moods', { score, note: note || undefined, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moods'] });
      setScore(null);
      setNote('');
      setTags([]);
      toast('Check-in saved');
      onDone?.();
    },
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="space-y-4">
      <div role="radiogroup" aria-label="How are you feeling?" className="grid grid-cols-5 gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood.score}
            type="button"
            role="radio"
            aria-checked={score === mood.score}
            onClick={() => setScore(mood.score)}
            className={classNames(
              'flex flex-col items-center gap-1 rounded-xl border py-3 transition-colors',
              score === mood.score ? 'border-primary bg-primary-soft' : 'border-border bg-card hover:bg-muted',
            )}
          >
            <span className="text-2xl sm:text-3xl" aria-hidden="true">{mood.emoji}</span>
            <span className="text-xs font-bold">{mood.label}</span>
          </button>
        ))}
      </div>

      {score && (
        <>
          <ChipGroup label="What's it about? (optional)" options={MOOD_TAGS} value={tags} onChange={setTags} />
          <Field label="Add a note (optional)">
            {(field) => <Textarea {...field} rows={2} maxLength={500} placeholder="A few words about your day" value={note} onChange={(event) => setNote(event.target.value)} />}
          </Field>
          <FormError error={save.error} />
          <Button type="submit" loading={save.isPending}>Save check-in</Button>
        </>
      )}
    </form>
  );
}

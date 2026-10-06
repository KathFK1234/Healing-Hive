import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { MOODS, moodFor } from '@/lib/moods';
import { Button, Card, Chip, EmptyState, Field, FormError, Input, Modal, PageHeader, QueryState, Textarea, useToast } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

const prompts = [
  'What is taking up the most space in my mind today?',
  'One thing that went better than I expected…',
  'What would I say to a friend who felt like this?',
];

const blank = { title: '', content: '', mood: null };

const Journal = () => {
  usePageTitle('Journal');
  const toast = useToast();
  const queryClient = useQueryClient();
  // null = closed, otherwise the entry being written or edited
  const [draft, setDraft] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const query = useQuery({ queryKey: ['journal'], queryFn: () => api.get('/journal') });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['journal'] });

  const save = useMutation({
    mutationFn: ({ _id, title, content, mood }) => {
      const body = { title: title || undefined, content, mood };
      return _id ? api.put(`/journal/${_id}`, body) : api.post('/journal', body);
    },
    onSuccess: () => {
      refresh();
      setDraft(null);
      toast('Entry saved');
    },
  });

  const remove = useMutation({
    mutationFn: (entry) => api.delete(`/journal/${entry._id}`),
    onSuccess: () => {
      refresh();
      setDeleting(null);
      toast('Entry deleted');
    },
  });

  const open = (entry) => {
    save.reset();
    setDraft(entry);
  };

  return (
    <>
      <PageHeader
        title="Journal"
        description={<span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4" aria-hidden="true" /> Only you can read what you write here.</span>}
        action={<Button onClick={() => open(blank)}><Plus className="h-4 w-4" aria-hidden="true" /> New entry</Button>}
      />

      <QueryState query={query}>
        {(entries) => entries.length === 0 ? (
          <EmptyState icon={NotebookPen} title="Your journal is empty" action={<Button onClick={() => open(blank)}>Write your first entry</Button>}>
            Writing things down can make them feel lighter. Not sure where to start? Try: "{prompts[0]}"
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry._id}>
                <Card as="article">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base">
                        {entry.mood && <span className="mr-1.5" title={moodFor(entry.mood).label} aria-label={`Mood: ${moodFor(entry.mood).label}.`}>{moodFor(entry.mood).emoji}</span>}
                        {entry.title || 'Untitled'}
                      </h2>
                      <p className="text-sm text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                    </div>
                    <button type="button" onClick={() => open(entry)} aria-label={`Edit ${entry.title || 'entry'}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => { remove.reset(); setDeleting(entry); }} aria-label={`Delete ${entry.title || 'entry'}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-danger">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-3 line-clamp-4 whitespace-pre-line leading-relaxed">{entry.content}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?._id ? 'Edit entry' : 'New entry'}
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button type="submit" form="journal-form" loading={save.isPending} disabled={!draft?.content.trim()}>Save entry</Button>
          </>
        }
      >
        {draft && (
          <form id="journal-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(draft); }}>
            <FormError error={save.error} />
            <Field label="Title (optional)">
              {(field) => <Input {...field} maxLength={120} value={draft.title || ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />}
            </Field>
            <Field label="What's on your mind?">
              {(field) => <Textarea {...field} rows={8} required placeholder={prompts[0]} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />}
            </Field>
            {!draft._id && !draft.content && (
              <div className="flex flex-wrap gap-2">
                {prompts.slice(1).map((prompt) => (
                  <button key={prompt} type="button" onClick={() => setDraft({ ...draft, content: `${prompt}\n\n` })} className="rounded-full border border-border px-3 py-1.5 text-left text-sm font-semibold hover:bg-muted">
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <fieldset>
              <legend className="mb-2 text-sm font-bold">Mood (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((mood) => (
                  <Chip key={mood.score} selected={draft.mood === mood.score} onClick={() => setDraft({ ...draft, mood: draft.mood === mood.score ? null : mood.score })}>
                    <span className="mr-1" aria-hidden="true">{mood.emoji}</span>{mood.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </form>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this entry?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(deleting)}>Delete</Button>
          </>
        }
      >
        <p>"{deleting?.title || 'Untitled'}" will be permanently deleted. This can't be undone.</p>
        <FormError error={remove.error} />
      </Modal>
    </>
  );
};

export default Journal;

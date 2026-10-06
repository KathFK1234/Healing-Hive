import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Bookmark, BookmarkCheck, Clock, Lightbulb, PenLine } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { NUGGET_TOPICS, NUGGET_TYPES } from '@/lib/options';
import { Badge, Button, Card, Chip, EmptyState, PageHeader, QueryState, useToast } from '@/components/ui';
import { NuggetForm } from '@/components/NuggetForm';
import { usePageTitle } from '@/hooks/usePageTitle';

const Nuggets = () => {
  usePageTitle('Mental health nuggets');
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') || '';
  const savedOnly = params.get('saved') === '1' && !!user;
  const page = Number(params.get('page')) || 1;
  const [writing, setWriting] = useState(false);
  const canWrite = ['therapist', 'peer', 'admin'].includes(user?.role);

  const setParam = (changes) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const list = useQuery({
    queryKey: ['nuggets', 'list', { topic, page }],
    queryFn: () => api.get('/nuggets', { topic, page }),
    placeholderData: keepPreviousData,
    enabled: !savedOnly,
  });
  const saved = useQuery({ queryKey: ['nuggets', 'saved'], queryFn: () => api.get('/nuggets/saved'), enabled: !!user });
  const savedIds = new Set(saved.data?.map((nugget) => nugget._id));

  const toggleSave = useMutation({
    mutationFn: (nugget) => savedIds.has(nugget._id) ? api.delete(`/nuggets/${nugget._id}/save`) : api.put(`/nuggets/${nugget._id}/save`),
    onSuccess: ({ saved: isSaved }) => {
      queryClient.invalidateQueries({ queryKey: ['nuggets', 'saved'] });
      toast(isSaved ? 'Saved for later' : 'Removed from saved');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const renderList = (nuggets) => nuggets.length === 0 ? (
    <EmptyState icon={Lightbulb} title={savedOnly ? 'Nothing saved yet' : 'No nuggets here yet'}>
      {savedOnly ? 'Tap the bookmark on any nugget to keep it here.' : 'Try another topic.'}
    </EmptyState>
  ) : (
    <ul className="grid gap-4 md:grid-cols-2">
      {nuggets.map((nugget) => {
        const type = NUGGET_TYPES[nugget.type] || NUGGET_TYPES.tip;
        const isSaved = savedIds.has(nugget._id);
        return (
          <li key={nugget._id}>
            <Card as="article" className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <Badge tone={type.tone}>{type.label}</Badge>
                {user && (
                  <button
                    type="button"
                    onClick={() => toggleSave.mutate(nugget)}
                    aria-pressed={isSaved}
                    aria-label={isSaved ? `Remove "${nugget.title}" from saved` : `Save "${nugget.title}" for later`}
                    className="-mr-2 -mt-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary"
                  >
                    {isSaved ? <BookmarkCheck className="h-5 w-5 text-primary" aria-hidden="true" /> : <Bookmark className="h-5 w-5" aria-hidden="true" />}
                  </button>
                )}
              </div>
              <h2 className="mt-3 text-lg">{nugget.title}</h2>
              <p className="mt-2 flex-1 leading-relaxed text-foreground/85">{nugget.content}</p>
              <p className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                <span>{nugget.topic}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {nugget.readMinutes} min read</span>
              </p>
            </Card>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader
        title="Mental health nuggets"
        description="Bite-sized ideas for your wellbeing. Read one in a minute or two."
        action={canWrite && <Button variant="outline" onClick={() => setWriting(true)}><PenLine className="h-4 w-4" aria-hidden="true" /> Write a nugget</Button>}
      />
      <NuggetForm open={writing} onClose={() => setWriting(false)} />

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Topics">
        <Chip selected={!topic && !savedOnly} onClick={() => setParam({ topic: '', saved: '' })}>All topics</Chip>
        {NUGGET_TOPICS.map((name) => (
          <Chip key={name} selected={topic === name && !savedOnly} onClick={() => setParam({ topic: name, saved: '' })}>{name}</Chip>
        ))}
        {user && (
          <Chip selected={savedOnly} onClick={() => setParam({ topic: '', saved: savedOnly ? '' : '1' })}>
            <Bookmark className="mr-1.5 h-4 w-4" aria-hidden="true" /> Saved
          </Chip>
        )}
      </div>

      {savedOnly ? (
        <QueryState query={saved}>{renderList}</QueryState>
      ) : (
        <QueryState query={list}>
          {(data) => (
            <>
              {renderList(data.items)}
              {data.pages > 1 && (
                <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setParam({ page: String(data.page - 1) })}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {data.page} of {data.pages}</span>
                  <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setParam({ page: String(data.page + 1) })}>Next</Button>
                </nav>
              )}
            </>
          )}
        </QueryState>
      )}

      <Card className="mt-10 flex flex-wrap items-center justify-between gap-4 bg-primary-soft">
        <div>
          <h2 className="text-lg">Ready to go deeper?</h2>
          <p className="text-sm text-muted-foreground">Talk things through with a therapist or a peer counsellor.</p>
        </div>
        <Button to="/therapists">Find support</Button>
      </Card>
    </>
  );
};

export default Nuggets;

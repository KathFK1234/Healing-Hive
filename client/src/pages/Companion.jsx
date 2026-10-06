import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import { Bot, Phone, SendHorizontal, Trash2, PowerOff } from 'lucide-react';
import { api } from '@/lib/api';
import { CRISIS_CONTACTS, telHref } from '@/lib/crisis';
import { formatTime } from '@/lib/format';
import { Button, Card, FormError, Modal, PageHeader, QueryState, useToast } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

const starters = [
  "I've been feeling anxious lately",
  "I can't sleep and my mind won't stop",
  "I'm stressed about school or work",
  'I just need someone to listen',
];

const Companion = () => {
  usePageTitle('AI companion');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const bottom = useRef(null);

  const query = useQuery({ queryKey: ['ai', 'messages'], queryFn: () => api.get('/ai/messages') });

  const send = useMutation({
    mutationFn: (message) => api.post('/ai/messages', { message }),
    onSuccess: ({ userMessage, reply }) => {
      queryClient.setQueryData(['ai', 'messages'], (current) => ({ ...current, messages: [...current.messages, userMessage, reply] }));
      setInput('');
    },
  });

  const clear = useMutation({
    mutationFn: () => api.delete('/ai/messages'),
    onSuccess: () => {
      queryClient.setQueryData(['ai', 'messages'], (current) => ({ ...current, messages: [] }));
      setConfirmClear(false);
      toast('Conversation cleared');
    },
  });

  const messages = query.data?.messages || [];
  const waitingFor = send.isPending ? send.variables : null;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, waitingFor]);

  const submit = (text) => {
    const message = text.trim();
    if (message && !send.isPending) send.mutate(message);
  };

  // A crisis message is still sent even when the companion is off, because the
  // server always answers those with help contacts.
  const off = query.data && !query.data.available;
  const showContacts = messages.at(-1)?.crisis;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="AI companion"
        description="A supportive listener for any hour. It is not a therapist and can't replace one."
        action={messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Clear chat</Button>
        )}
      />

      <QueryState query={query}>
        {() => (
          <Card className="flex h-[calc(100dvh-21rem)] min-h-[26rem] flex-col p-0 lg:h-[calc(100dvh-16rem)]">
            <div className="flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Conversation">
              <Bubble role="assistant">
                Hi, I'm the Healing Hive companion. I'm here to listen, without judgement. How are you feeling today?
              </Bubble>

              {messages.map((message) => (
                <Bubble key={message._id} role={message.role} time={message.createdAt}>{message.message}</Bubble>
              ))}
              {waitingFor && (
                <>
                  <Bubble role="user">{waitingFor}</Bubble>
                  <Bubble role="assistant"><span className="animate-pulse">Thinking…</span></Bubble>
                </>
              )}

              {off && !showContacts && (
                <div className="rounded-xl bg-muted p-4 text-sm">
                  <p className="flex items-center gap-2 font-extrabold"><PowerOff className="h-4 w-4" aria-hidden="true" /> The companion isn't switched on yet</p>
                  <p className="mt-1 text-muted-foreground">
                    We're still setting it up. In the meantime you can <Link to="/therapists" className="font-bold text-primary hover:underline">book a person</Link>,
                    write in your <Link to="/journal" className="font-bold text-primary hover:underline">journal</Link>, or
                    {' '}<Link to="/help" className="font-bold text-danger hover:underline">get help now</Link> if things feel urgent.
                  </p>
                </div>
              )}

              {showContacts && (
                <div className="rounded-xl border border-danger/40 bg-danger-soft p-4">
                  <p className="font-extrabold text-danger">Please reach a person now</p>
                  <ul className="mt-2 space-y-2">
                    {CRISIS_CONTACTS.slice(0, 3).map((contact) => (
                      <li key={contact.phone}>
                        <a href={telHref(contact.phone)} className="flex items-center gap-2 text-sm font-bold hover:underline">
                          <Phone className="h-4 w-4 text-danger" aria-hidden="true" />
                          {contact.name}: {contact.phone}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <Link to="/help" className="mt-2 inline-block text-sm font-bold text-danger hover:underline">More help contacts</Link>
                </div>
              )}
              <div ref={bottom} />
            </div>

            {messages.length === 0 && !waitingFor && !off && (
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {starters.map((starter) => (
                  <button key={starter} type="button" onClick={() => submit(starter)} className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted">
                    {starter}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(event) => { event.preventDefault(); submit(input); }}
              className="space-y-2 border-t border-border p-3"
            >
              <FormError error={send.error} />
              <div className="flex items-end gap-2">
                <textarea
                  aria-label="Your message"
                  rows={1}
                  maxLength={2000}
                  placeholder="Type how you're feeling…"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter sends, Shift+Enter makes a new line
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submit(input);
                    }
                  }}
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-base focus-visible:ring-offset-0"
                />
                <Button type="submit" aria-label="Send" className="w-11 px-0" disabled={!input.trim()} loading={send.isPending}>
                  {!send.isPending && <SendHorizontal className="h-5 w-5" aria-hidden="true" />}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </QueryState>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        The companion is an AI and can be wrong. In an emergency call 999 or 112.
      </p>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear this conversation?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Keep it</Button>
            <Button variant="danger" loading={clear.isPending} onClick={() => clear.mutate()}>Clear chat</Button>
          </>
        }
      >
        <p>Every message in this chat will be permanently deleted. This can't be undone.</p>
        <FormError error={clear.error} />
      </Modal>
    </div>
  );
};

function Bubble({ role, time, children }) {
  const mine = role === 'user';
  return (
    <div className={classNames('flex gap-2', mine && 'justify-end')}>
      {!mine && (
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className={classNames(
        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 leading-relaxed',
        mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted',
      )}>
        <span className="sr-only">{mine ? 'You: ' : 'Companion: '}</span>
        {children}
        {time && <span className={classNames('mt-1 block text-xs', mine ? 'opacity-80' : 'text-muted-foreground')}>{formatTime(time)}</span>}
      </div>
    </div>
  );
}

export default Companion;

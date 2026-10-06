import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { NUGGET_TOPICS, NUGGET_TYPES } from '@/lib/options';
import { Button, Field, FormError, Input, Modal, Select, Textarea, useToast } from '@/components/ui';

const blank = { title: '', content: '', topic: NUGGET_TOPICS[0], type: 'tip', readMinutes: 1 };

// Professionals submit nuggets for review; an admin's are published straight away.
export function NuggetForm({ open, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blank);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const isAdmin = user?.role === 'admin';

  const save = useMutation({
    mutationFn: () => api.post('/nuggets', { ...form, readMinutes: Number(form.readMinutes), status: isAdmin ? 'published' : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nuggets'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setForm(blank);
      onClose();
      toast(isAdmin ? 'Nugget published' : 'Sent for review. Thank you!');
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Write a nugget"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="nugget-form" loading={save.isPending}>{isAdmin ? 'Publish' : 'Send for review'}</Button>
        </>
      }
    >
      <form id="nugget-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <FormError error={save.error} />
        {!isAdmin && <p className="text-sm text-muted-foreground">Our team reviews every nugget before it is published.</p>}
        <Field label="Title">
          {(field) => <Input {...field} required minLength={3} maxLength={120} value={form.title} onChange={set('title')} />}
        </Field>
        <Field label="Content" hint="Keep it short, kind and practical. Around 40 to 80 words works well.">
          {(field) => <Textarea {...field} required minLength={10} maxLength={3000} rows={6} value={form.content} onChange={set('content')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Topic">
            {(field) => <Select {...field} value={form.topic} onChange={set('topic')}>{NUGGET_TOPICS.map((topic) => <option key={topic}>{topic}</option>)}</Select>}
          </Field>
          <Field label="Kind">
            {(field) => (
              <Select {...field} value={form.type} onChange={set('type')}>
                {Object.entries(NUGGET_TYPES).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Minutes to read">
            {(field) => <Input {...field} type="number" min={1} max={30} required value={form.readMinutes} onChange={set('readMinutes')} />}
          </Field>
        </div>
      </form>
    </Modal>
  );
}

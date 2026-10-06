import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, Input, FormError } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { PasswordInput } from '@/components/PasswordInput';
import { usePageTitle } from '@/hooks/usePageTitle';

const Signup = () => {
  usePageTitle('Create your account');
  const { register } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const mutation = useMutation({ mutationFn: register });
  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  // Show the server's message next to the field it is about.
  const fieldError = (name) => mutation.error?.details?.find((detail) => detail.field === name)?.message;
  const hasFieldErrors = Boolean(mutation.error?.details?.length);

  return (
    <AuthShell
      title="Start your healing journey"
      description="Free to join. You choose what to share."
      footer={
        <>
          <p>Already have an account? <Link to="/login" state={location.state} className="font-semibold text-primary hover:underline">Sign in</Link></p>
          <p>A therapist, peer counsellor or institution? <Link to="/professionals/signup" className="font-semibold text-primary hover:underline">Sign up as a professional</Link></p>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {!hasFieldErrors && <FormError error={mutation.error} />}
        <Field label="What should we call you?" error={fieldError('fullName')}>
          {(field) => <Input {...field} autoComplete="name" required placeholder="Your name" value={form.fullName} onChange={set('fullName')} />}
        </Field>
        <Field label="Email" error={fieldError('email')}>
          {(field) => <Input {...field} type="email" autoComplete="email" required placeholder="you@example.com" value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="Password" hint="At least 8 characters." error={fieldError('password')}>
          {(field) => <PasswordInput {...field} autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>Create account</Button>
      </form>
    </AuthShell>
  );
};

export default Signup;

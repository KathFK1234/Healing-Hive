import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, Input, FormError } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { PasswordInput } from '@/components/PasswordInput';
import { usePageTitle } from '@/hooks/usePageTitle';

const Login = () => {
  usePageTitle('Sign in');
  const { login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  // On success the route guard notices the signed-in user and moves on.
  const mutation = useMutation({ mutationFn: login });
  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to pick up where you left off."
      footer={<p>New here? <Link to="/signup" state={location.state} className="font-semibold text-primary hover:underline">Create an account</Link></p>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError error={mutation.error} />
        <Field label="Email">
          {(field) => <Input {...field} type="email" autoComplete="email" required placeholder="you@example.com" value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="Password">
          {(field) => <PasswordInput {...field} autoComplete="current-password" required value={form.password} onChange={set('password')} />}
        </Field>
        <p className="text-right">
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">Forgot your password?</Link>
        </p>
        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>Sign in</Button>
      </form>
    </AuthShell>
  );
};

export default Login;

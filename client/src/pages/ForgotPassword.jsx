import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Field, Input, FormError } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { usePageTitle } from '@/hooks/usePageTitle';

const ForgotPassword = () => {
  usePageTitle('Reset your password');
  const [email, setEmail] = useState('');
  const mutation = useMutation({ mutationFn: () => api.post('/auth/forgot-password', { email }) });

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to choose a new one."
      footer={<p>Remembered it? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>}
    >
      {mutation.isSuccess ? (
        <div role="status" className="space-y-4 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
          <p className="text-lg font-bold">Check your email</p>
          <p className="text-muted-foreground">
            If an account uses <strong className="text-foreground">{email}</strong>, a reset link is on its way. It works for one hour.
            It can take a few minutes, and may land in spam.
          </p>
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} className="space-y-5" noValidate>
          <FormError error={mutation.error} />
          <Field label="Email">
            {(field) => <Input {...field} type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />}
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending} disabled={!email.trim()}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;

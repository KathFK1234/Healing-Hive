import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, FormError } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { PasswordInput } from '@/components/PasswordInput';
import { usePageTitle } from '@/hooks/usePageTitle';

const ResetPassword = () => {
  usePageTitle('Choose a new password');
  const { acceptSession } = useAuth();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [newPassword, setNewPassword] = useState('');

  // On success the person is signed in, and the route guard takes them home.
  const mutation = useMutation({
    mutationFn: () => api.post('/auth/reset-password', { token, newPassword }),
    onSuccess: acceptSession,
  });

  return (
    <AuthShell
      title="Choose a new password"
      description="You'll be signed in as soon as it's saved."
      footer={<p><Link to="/forgot-password" className="font-semibold text-primary hover:underline">Send me a new link</Link></p>}
    >
      {!token ? (
        <p role="alert" className="text-danger">This link is incomplete. Open the link from your email again, or ask for a new one below.</p>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} className="space-y-5" noValidate>
          <FormError error={mutation.error} />
          <Field label="New password" hint="At least 8 characters.">
            {(field) => <PasswordInput {...field} autoComplete="new-password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />}
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending} disabled={newPassword.length < 8}>Save and sign in</Button>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;

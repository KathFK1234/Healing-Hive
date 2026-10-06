import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LANGUAGES, PROFESSIONAL_TYPES } from '@/lib/options';
import { Button, Card, Field, FormError, Input, PageHeader, Select, useToast } from '@/components/ui';
import { PasswordInput } from '@/components/PasswordInput';
import { usePageTitle } from '@/hooks/usePageTitle';

const SettingsPage = () => {
  usePageTitle('Settings');
  const { user, signOut } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState({ fullName: user.fullName, phone: user.phone || '', preferredLanguage: user.preferredLanguage || 'English' });
  const saveProfile = useMutation({
    mutationFn: () => api.patch('/auth/me', profile),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
      toast('Profile saved');
    },
  });

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const savePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', passwords),
    onSuccess: () => {
      setPasswords({ currentPassword: '', newPassword: '' });
      toast('Password updated');
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" />

      <Card>
        <h2 className="text-lg">Your details</h2>
        <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); saveProfile.mutate(); }}>
          <FormError error={saveProfile.error} />
          <Field label="Name">
            {(field) => <Input {...field} required autoComplete="name" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} />}
          </Field>
          <Field label="Email" hint="Your email can't be changed here yet.">
            {(field) => <Input {...field} type="email" value={user.email} disabled readOnly />}
          </Field>
          <Field label="Phone (optional)" hint="For example 0712 345 678">
            {(field) => <Input {...field} type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />}
          </Field>
          <Field label="Preferred language">
            {(field) => (
              <Select {...field} value={profile.preferredLanguage} onChange={(event) => setProfile({ ...profile, preferredLanguage: event.target.value })}>
                {LANGUAGES.map((language) => <option key={language}>{language}</option>)}
              </Select>
            )}
          </Field>
          <Button type="submit" loading={saveProfile.isPending}>Save changes</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg">Change password</h2>
        <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); savePassword.mutate(); }}>
          <FormError error={savePassword.error} />
          <Field label="Current password">
            {(field) => <PasswordInput {...field} required autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />}
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            {(field) => <PasswordInput {...field} required minLength={8} autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />}
          </Field>
          <Button type="submit" loading={savePassword.isPending} disabled={!passwords.currentPassword || passwords.newPassword.length < 8}>Update password</Button>
        </form>
      </Card>

      {user.role === 'user' ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg">Are you a mental health professional?</h2>
            <p className="text-sm text-muted-foreground">Apply to be listed as a therapist or peer counsellor.</p>
          </div>
          <Button to="/apply" variant="outline">Apply</Button>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Account type: {PROFESSIONAL_TYPES[user.role] || 'Administrator'}</p>
      )}

      <Button variant="outline" onClick={signOut}>Sign out</Button>
    </div>
  );
};

export default SettingsPage;

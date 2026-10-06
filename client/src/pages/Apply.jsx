import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hourglass, CircleAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { homePath, isPractitioner } from '@/lib/roles';
import { Card, PageHeader, QueryState, useToast } from '@/components/ui';
import { ProfessionalForm } from '@/components/ProfessionalForm';
import { usePageTitle } from '@/hooks/usePageTitle';

// Where an applicant checks on, and can update, their application. Also where
// someone with a personal account applies from.
const Apply = () => {
  usePageTitle('Your application');
  const { user, retry } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['professionals', 'me'], queryFn: () => api.get('/professionals/me') });

  const apply = useMutation({
    mutationFn: (values) => api.post('/professionals/apply', values),
    onSuccess: (profile) => {
      queryClient.setQueryData(['professionals', 'me'], profile);
      // The account is now a professional one, which changes the menu
      retry();
      toast('Application sent');
      window.scrollTo({ top: 0 });
    },
  });

  if (isPractitioner(user) || user.role === 'institution') return <Navigate to={homePath(user)} replace />;

  return (
    <div className="mx-auto max-w-2xl">
      <QueryState query={query}>
        {(profile) => (
          <>
            <PageHeader
              title={profile ? 'Your application' : 'Apply as a professional'}
              description={profile ? undefined : 'Tell us about your practice. We review every application before listing anyone.'}
            />

            {user.role === 'admin' && (
              <Card className="bg-muted">Admin accounts can't apply as a professional. Use a separate account instead.</Card>
            )}
            {profile?.status === 'pending' && (
              <Card className="mb-10 flex gap-4 border-transparent bg-honey-soft">
                <Hourglass className="mt-1 h-6 w-6 shrink-0 text-honey-foreground dark:text-honey" aria-hidden="true" />
                <div>
                  <p className="text-lg font-bold">We're reviewing your application</p>
                  <p className="mt-1 text-muted-foreground">
                    We'll email {user.email} as soon as there's a decision. You can still change anything below while you wait.
                  </p>
                </div>
              </Card>
            )}
            {profile?.status === 'rejected' && (
              <Card className="mb-10 flex gap-4 border-transparent bg-danger-soft">
                <CircleAlert className="mt-1 h-6 w-6 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <p className="text-lg font-bold">Your application needs changes</p>
                  <p className="mt-1">{profile.reviewNote || 'Please review your details and send it again.'}</p>
                </div>
              </Card>
            )}
            {user.role === 'user' && (
              <Card>
                <ProfessionalForm
                  key={profile?.updatedAt || 'new'}
                  profile={profile}
                  mode="apply"
                  type={profile?.type}
                  mutation={apply}
                  submitLabel={profile ? 'Save changes' : 'Send application'}
                />
              </Card>
            )}
          </>
        )}
      </QueryState>
    </div>
  );
};

export default Apply;

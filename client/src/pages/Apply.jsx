import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hourglass, CircleAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, PageHeader, QueryState, useToast } from '@/components/ui';
import { ProfessionalForm } from '@/components/ProfessionalForm';
import { usePageTitle } from '@/hooks/usePageTitle';

const Apply = () => {
  usePageTitle('Apply as a professional');
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['professionals', 'me'], queryFn: () => api.get('/professionals/me') });

  const apply = useMutation({
    mutationFn: (values) => api.post('/professionals/apply', values),
    onSuccess: (profile) => {
      queryClient.setQueryData(['professionals', 'me'], profile);
      toast('Application sent');
      window.scrollTo({ top: 0 });
    },
  });

  if (user.role === 'therapist' || user.role === 'peer') return <Navigate to="/practice" replace />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Apply as a professional"
        description="Tell us about your practice. We review every application before listing anyone."
      />

      <QueryState query={query}>
        {(profile) => (
          <>
            {user.role !== 'user' && (
              <Card className="mb-6 bg-muted">This account type can't apply as a professional. Use a personal account instead.</Card>
            )}
            {profile?.status === 'pending' && (
              <Card className="mb-6 flex gap-3 bg-honey-soft">
                <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-honey-foreground dark:text-honey" aria-hidden="true" />
                <div>
                  <p className="font-extrabold">Your application is being reviewed</p>
                  <p className="text-sm text-muted-foreground">You can still update it below. You'll be listed as soon as it's approved.</p>
                </div>
              </Card>
            )}
            {profile?.status === 'rejected' && (
              <Card className="mb-6 flex gap-3 bg-danger-soft">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <p className="font-extrabold">Your application needs changes</p>
                  <p className="text-sm">{profile.reviewNote || 'Please review your details and send it again.'}</p>
                </div>
              </Card>
            )}
            {profile?.status === 'approved' ? (
              <Card>Your profile is approved. Institution tools are on the way.</Card>
            ) : user.role === 'user' && (
              <Card>
                <ProfessionalForm
                  key={profile?.updatedAt || 'new'}
                  profile={profile}
                  mode="apply"
                  mutation={apply}
                  submitLabel={profile ? 'Update application' : 'Send application'}
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

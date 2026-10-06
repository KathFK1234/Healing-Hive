import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner, ErrorState } from '@/components/ui';
import { AppLayout } from './AppLayout';
import { PublicLayout } from './PublicLayout';

function AuthGate({ children }) {
  const { loading, error, retry } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (error && error.status !== 401) {
    return <div className="mx-auto max-w-md p-6 pt-24"><ErrorState error={error} onRetry={retry} /></div>;
  }
  return children;
}

// Pages that need an account. Sends people to sign in, then back to where they
// were going. `roles` limits a page to certain kinds of account.
export function Protected({ roles }) {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <AuthGate>
      {!user
        ? <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
        : roles && !roles.includes(user.role)
          ? <Navigate to="/home" replace />
          : <AppLayout><Outlet /></AppLayout>}
    </AuthGate>
  );
}

// Pages anyone can open (directory, nuggets, events, help). Signed-in people
// see them inside their own space; visitors see the public site around them.
export function Open() {
  const { user } = useAuth();
  return (
    <AuthGate>
      {user
        ? <AppLayout><Outlet /></AppLayout>
        : <PublicLayout><div className="container py-8"><Outlet /></div></PublicLayout>}
    </AuthGate>
  );
}

// Sign in, sign up and the landing page: no use to someone already signed in.
export function GuestOnly() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <AuthGate>
      {user ? <Navigate to={location.state?.from || '/home'} replace /> : <Outlet />}
    </AuthGate>
  );
}

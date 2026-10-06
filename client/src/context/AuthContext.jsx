import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, tokenStore } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStore.get());

  // The signed-in person always comes from the server, never from a stored
  // copy, so a role change (for example being approved as a therapist) shows up.
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me'),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => error.status !== 401 && count < 2,
  });

  // The session ran out on its own. Stay in the app so that, after signing in
  // again, the person lands back on the page they were using.
  const expire = useCallback(() => {
    tokenStore.set(null);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  // The person chose to sign out. Reload to the landing page so nothing of
  // theirs is left in memory, and the next person to sign in on this device
  // starts fresh instead of being sent to wherever the last person was.
  const signOut = useCallback(() => {
    tokenStore.set(null);
    window.location.assign('/');
  }, []);

  // api.js fires this when the server says the session is no longer valid.
  useEffect(() => {
    window.addEventListener('hh:signed-out', expire);
    return () => window.removeEventListener('hh:signed-out', expire);
  }, [expire]);

  const value = useMemo(() => {
    const accept = ({ token: newToken, user }) => {
      tokenStore.set(newToken);
      queryClient.setQueryData(['me'], user);
      setToken(newToken);
      return user;
    };
    return {
      user: token ? me.data ?? null : null,
      loading: !!token && me.isPending,
      error: token && me.isError ? me.error : null,
      retry: me.refetch,
      login: async (credentials) => accept(await api.post('/auth/login', credentials)),
      register: async (details) => accept(await api.post('/auth/register', details)),
      signOut,
    };
  }, [token, me.data, me.isPending, me.isError, me.error, me.refetch, queryClient, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

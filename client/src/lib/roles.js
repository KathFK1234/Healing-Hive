// What each kind of account sees. Clients and professionals use the same
// sign-in but get different homes and different menus.
export const isPractitioner = (user) => user?.role === 'therapist' || user?.role === 'peer';

// A professional who has applied and is waiting for (or fixing) their application
export const isApplicant = (user) => user?.role === 'user' && user?.accountType === 'professional';

// Where someone lands after signing in
export function homePath(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  if (isPractitioner(user)) return '/practice';
  if (user.role === 'institution') return '/institution';
  if (isApplicant(user)) return '/apply';
  return '/home';
}

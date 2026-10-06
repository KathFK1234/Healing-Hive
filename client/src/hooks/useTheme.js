import { useCallback, useState } from 'react';

// Light / dark mode. The first paint is handled by the inline script in
// index.html; this keeps the toggle button in step and remembers the choice.
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggle = useCallback(() => {
    setDark((current) => {
      const next = !current;
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem('hh-theme', next ? 'dark' : 'light');
      } catch {
        // Storage blocked: the choice simply lasts for this visit.
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}

import { useEffect } from 'react';

// Sets the browser tab title, which screen readers announce on navigation.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Healing Hive` : 'Healing Hive: St;ll Here';
  }, [title]);
}

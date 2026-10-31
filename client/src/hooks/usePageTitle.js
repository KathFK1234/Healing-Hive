import { useEffect } from 'react';

// Sets the browser tab title. A screen reader says it after a real page load,
// but moving around inside the app loads nothing, so the region in index.html
// says it instead. The first page has already been read out.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Healing Hive` : 'Healing Hive: St;ll Here';
    const region = document.getElementById('page-announcer');
    if (region?.dataset.ready) region.textContent = document.title;
    else if (region) region.dataset.ready = 'true';
  }, [title]);
}

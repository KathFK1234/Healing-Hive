// Whether the last call to the API found it out of reach. api.js sets it after
// every call; the notice in the layouts reads it (useSyncExternalStore), so it
// appears with the first failed call and goes away with the first answer.

export const HOSTING_STATUS_URL = 'https://status.railway.com';

let down = false;
const listeners = new Set();

export const outage = {
  get: () => down,
  set(value) {
    if (value === down) return;
    down = value;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

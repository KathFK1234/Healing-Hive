// How the app reads a failed call to the API. Kept apart from api.js (no
// fetch, no import.meta) so `npm test` can check it in Node.

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// The API could not be reached at all. The browser hides why (offline, server
// unreachable, or refused by CORS, which is how Railway's own error pages
// arrive: they carry no CORS header), but it does know when the device itself
// is offline.
export function errorForNoAnswer(offline) {
  if (offline) return new ApiError(0, 'OFFLINE', "You're offline. Check your internet connection and try again");
  return new ApiError(0, 'NETWORK', "We couldn't reach the Healing Hive server. If your internet is working, the server may be down: please try again in a few minutes");
}

// An answer arrived. Returns null when it is the API's data, otherwise the
// error to show.
export function errorForAnswer({ status, ok, contentType = '', data }) {
  if (ok) {
    // The API always answers in JSON (null included). A successful reply that
    // isn't came from another site, usually a web page at a wrong VITE_API_URL.
    if (contentType.includes('application/json')) return null;
    return new ApiError(status, 'NOT_CONNECTED', "This app couldn't find the Healing Hive server, so this couldn't load. Please try again later");
  }

  // Every error the API sends has { error: { code, message } }.
  if (data?.error?.message) return new ApiError(status, data.error.code || 'ERROR', data.error.message, data.error.details);

  // Anything else came from something in front of it: the host while the API
  // is down, restarting or failing to deploy (Railway's 502/503/504, or its
  // "Application not found"), or a server that is not the API at all because
  // the app was built with the wrong address (VITE_API_URL).
  if (status >= 500) {
    return new ApiError(status, 'SERVER_DOWN', "The Healing Hive server isn't responding right now, so this couldn't load. Please try again in a few minutes");
  }
  if (status === 429) {
    return new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many requests in a short time. Please wait a minute and try again');
  }
  return new ApiError(status, 'NOT_CONNECTED', "This app couldn't find the Healing Hive server, so this couldn't load. Please try again later");
}

// The server is out of reach for reasons outside the person's control (and
// outside the app's): not a wrong password, a missing item or their own
// connection being off.
const OUTAGE_CODES = new Set(['NETWORK', 'SERVER_DOWN', 'NOT_CONNECTED']);
export const isOutage = (error) => OUTAGE_CODES.has(error?.code);

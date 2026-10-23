// The one place the app talks to the server. Pages call api.get / api.post and
// get parsed data back, or an ApiError with a message that is safe to show.
import { errorForAnswer, errorForNoAnswer, isOutage } from './apiError';
import { outage } from './outage';

const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;
const TOKEN_KEY = 'hh-token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Private browsing can block storage. The session then lasts until reload.
    }
  },
};

async function request(method, path, body) {
  const token = tokenStore.get();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const failure = errorForNoAnswer(typeof navigator !== 'undefined' && navigator.onLine === false);
    // Being offline is the device's own state, not the server's
    if (failure.code !== 'OFFLINE') {
      console.error(`Healing Hive API: ${method} ${BASE_URL}${path} could not be reached`, error);
      outage.set(true);
    }
    throw failure;
  }

  const data = await response.json().catch(() => null);
  const contentType = response.headers.get('content-type') || '';
  const failure = errorForAnswer({ status: response.status, ok: response.ok, contentType, data });
  outage.set(isOutage(failure));
  if (!failure) return data;

  // Not the API's own answer: leave the details in the console for whoever
  // runs the site.
  if (!data?.error?.message) {
    console.error(`Healing Hive API: ${method} ${BASE_URL}${path} answered ${response.status} with ${contentType || 'no content type'}, not the API's own answer`, data);
  }

  // An expired or invalid session: tell the auth context so it can sign out.
  if (failure.status === 401 && data?.error?.message && token) window.dispatchEvent(new Event('hh:signed-out'));

  throw failure;
}

function withQuery(path, params) {
  if (!params) return path;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export const api = {
  get: (path, params) => request('GET', withQuery(path, params)),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body ?? {}),
  delete: (path) => request('DELETE', path),
};

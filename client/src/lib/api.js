// The one place the app talks to the server. Pages call api.get / api.post and
// get parsed data back, or an ApiError with a message that is safe to show.
const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;
const TOKEN_KEY = 'hh-token';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

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
    // The browser hides why (offline, server unreachable, or refused by CORS),
    // but it does know when the device itself is offline.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiError(0, 'OFFLINE', "You're offline. Check your internet connection and try again");
    }
    console.error(`Healing Hive API: ${method} ${BASE_URL}${path} could not be reached`, error);
    throw new ApiError(0, 'NETWORK', "We couldn't reach the Healing Hive server. If your internet is working, the server may be down: please try again in a few minutes");
  }

  const data = await response.json().catch(() => null);
  if (response.ok) return data;

  // Every error the API sends has { error: { code, message } }. Anything else
  // came from something in front of it: the host while the API is down or
  // restarting, or a server that is not the API at all because the app was
  // built with the wrong address (VITE_API_URL). Say which, and leave the
  // details in the console for whoever runs the site.
  if (!data?.error?.message) {
    console.error(`Healing Hive API: ${method} ${BASE_URL}${path} answered ${response.status} without an API error`, data);
    if (response.status >= 500) {
      throw new ApiError(response.status, 'SERVER_DOWN', "The Healing Hive server isn't responding right now, so this couldn't load. Please try again in a few minutes");
    }
    if (response.status === 429) {
      throw new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many requests in a short time. Please wait a minute and try again');
    }
    throw new ApiError(response.status, 'NOT_CONNECTED', "This app couldn't find the Healing Hive server, so this couldn't load. Please try again later");
  }

  // An expired or invalid session: tell the auth context so it can sign out.
  if (response.status === 401 && token) window.dispatchEvent(new Event('hh:signed-out'));

  throw new ApiError(response.status, data.error.code || 'ERROR', data.error.message, data.error.details);
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

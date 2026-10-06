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
  } catch {
    throw new ApiError(0, 'NETWORK', 'We could not reach Healing Hive. Check your connection and try again');
  }

  const data = await response.json().catch(() => null);
  if (response.ok) return data;

  // An expired or invalid session: tell the auth context so it can sign out.
  if (response.status === 401 && token) window.dispatchEvent(new Event('hh:signed-out'));

  throw new ApiError(
    response.status,
    data?.error?.code || 'ERROR',
    data?.error?.message || 'Something went wrong. Please try again',
    data?.error?.details,
  );
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

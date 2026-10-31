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

// A server that takes the call and never answers would otherwise leave the
// page waiting for ever, with no outage notice.
const WAIT_MS = 30 * 1000;
const FILE_WAIT_MS = 2 * 60 * 1000;

// `file` sends a file as the body itself (with its type and name); `asFile`
// returns a successful answer as a Blob instead of JSON. `waitMs` is for calls
// that are slow by nature.
async function request(method, path, body, { file, fileType, asFile, waitMs = file || asFile ? FILE_WAIT_MS : WAIT_MS } = {}) {
  const token = tokenStore.get();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(file
          ? { 'Content-Type': fileType || file.type, 'X-Filename': encodeURIComponent(file.name) }
          : body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: file ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: AbortSignal.timeout(waitMs),
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

  const contentType = response.headers.get('content-type') || '';
  // A file from the API. A web page instead means some other site answered.
  if (asFile && response.ok && !contentType.includes('text/html')) {
    outage.set(false);
    return response.blob();
  }

  const data = await response.json().catch(() => null);
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
  post: (path, body, options) => request('POST', path, body ?? {}, options),
  put: (path, body) => request('PUT', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body ?? {}),
  delete: (path) => request('DELETE', path),
  // Sends a file as it is, for example a certificate
  upload: (path, file, fileType) => request('PUT', path, undefined, { file, fileType }),
  // Fetches a file the API sends back (with the sign-in token, which a plain link can't carry)
  download: (path) => request('GET', path, undefined, { asFile: true }),
};

// Hands a downloaded file to the browser to save
export function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

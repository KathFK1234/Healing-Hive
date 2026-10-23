import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorForAnswer, errorForNoAnswer, isOutage } from './apiError.js';
import { outage } from './outage.js';

const apiError = (status, code, message) => errorForAnswer({ status, ok: false, contentType: 'application/json; charset=utf-8', data: { error: { code, message } } });

test("the API's own data is not an error", () => {
  assert.equal(errorForAnswer({ status: 200, ok: true, contentType: 'application/json; charset=utf-8', data: { items: [] } }), null);
  assert.equal(errorForAnswer({ status: 200, ok: true, contentType: 'application/json', data: null }), null);
});

test("the API's own errors keep their message and are not an outage", () => {
  for (const [status, code, message] of [
    [400, 'BAD_REQUEST', 'Enter a valid email address'],
    [401, 'UNAUTHORIZED', 'Incorrect email or password'],
    [404, 'NOT_FOUND', 'Professional not found'],
    [409, 'CONFLICT', 'That time was just taken. Please pick another'],
    [429, 'TOO_MANY_REQUESTS', 'Too many attempts. Please wait a few minutes and try again'],
    [500, 'SERVER_ERROR', 'The server hit a problem it did not expect'],
  ]) {
    const error = apiError(status, code, message);
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    assert.equal(error.message, message);
    assert.equal(isOutage(error), false, `${status} ${code}`);
  }
});

test("the host answering for an API that is down or failed to deploy is an outage", () => {
  for (const status of [502, 503, 504]) {
    assert.equal(isOutage(errorForAnswer({ status, ok: false, contentType: 'text/html', data: null })), true, `${status}`);
  }
  // Railway's answer when no deployment is serving the address
  const notFound = errorForAnswer({ status: 404, ok: false, contentType: 'application/json', data: { status: 'error', code: 404, message: 'Application not found' } });
  assert.equal(notFound.code, 'NOT_CONNECTED');
  assert.equal(isOutage(notFound), true);
  // A web page where the API should be (a wrong VITE_API_URL)
  assert.equal(isOutage(errorForAnswer({ status: 200, ok: true, contentType: 'text/html', data: null })), true);
});

test("no answer at all is an outage, unless the device is offline", () => {
  assert.equal(isOutage(errorForNoAnswer(false)), true);
  const offline = errorForNoAnswer(true);
  assert.equal(offline.code, 'OFFLINE');
  assert.equal(isOutage(offline), false);
});

test("a host's rate limit is not an outage", () => {
  assert.equal(isOutage(errorForAnswer({ status: 429, ok: false, contentType: 'text/plain', data: null })), false);
});

test("the outage flag tells its listeners only when it changes", () => {
  let calls = 0;
  const stop = outage.subscribe(() => calls++);
  outage.set(false);
  outage.set(true);
  outage.set(true);
  assert.equal(outage.get(), true);
  outage.set(false);
  stop();
  outage.set(true);
  assert.equal(calls, 2);
  outage.set(false);
});

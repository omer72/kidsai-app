import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import {
  DEFAULT_FREE_MOMENTS,
  FREE_ATTRIBUTE,
  checkAccess,
  freeLimit,
  freeRemaining,
  recordFreeUse,
  requireEntitlement,
  resetEntitlementCache,
} from '../netlify/lib/entitlement.js';

const CORS = { 'Access-Control-Allow-Origin': '*' };
const ENFORCED = { RC_SECRET_KEY: 'sk_test', AUTH_ENFORCE: 'true' };

function request(uid) {
  return new Request('https://example.test/api/guidance', {
    method: 'POST',
    headers: uid ? { 'X-RC-User': uid } : {},
  });
}

// A stand-in for RevenueCat: GET returns the subscriber, POST stores attributes.
function fakeRevenueCat({ entitled = false, used = null, status = 200 } = {}) {
  const calls = [];
  const store = { used };
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
    if (status !== 200) return new Response('nope', { status });
    if ((init.method || 'GET') === 'POST') {
      store.used = Number(JSON.parse(init.body).attributes[FREE_ATTRIBUTE].value);
      return new Response('{}', { status: 200 });
    }
    return Response.json({
      subscriber: {
        entitlements: entitled ? { premium: { expires_date: new Date(Date.now() + 86400000).toISOString() } } : {},
        subscriber_attributes: store.used === null ? {} : { [FREE_ATTRIBUTE]: { value: String(store.used) } },
      },
    });
  };
  return { fetchImpl, calls, store };
}

beforeEach(() => resetEntitlementCache());

test('freeLimit defaults to 3 and accepts 0', () => {
  assert.equal(DEFAULT_FREE_MOMENTS, 3);
  assert.equal(freeLimit({}), 3);
  assert.equal(freeLimit({ FREE_MOMENTS: '' }), 3);
  assert.equal(freeLimit({ FREE_MOMENTS: '0' }), 0);
  assert.equal(freeLimit({ FREE_MOMENTS: '5' }), 5);
  assert.equal(freeLimit({ FREE_MOMENTS: '-1' }), 3);
  assert.equal(freeLimit({ FREE_MOMENTS: 'many' }), 3);
});

test('no secret key: the check is skipped', async () => {
  const { denied, grant } = await checkAccess(request('u1'), CORS, { env: {} });
  assert.equal(denied, null);
  assert.equal(grant, null);
});

test('a subscriber is allowed and nothing is counted', async () => {
  const rc = fakeRevenueCat({ entitled: true });
  const { denied, grant } = await checkAccess(request('u1'), CORS, { env: ENFORCED, fetchImpl: rc.fetchImpl });
  assert.equal(denied, null);
  assert.equal(grant.entitled, true);
  assert.equal(freeRemaining(grant), null);
  await recordFreeUse(grant, { env: ENFORCED, fetchImpl: rc.fetchImpl });
  assert.equal(rc.calls.filter((c) => c.method === 'POST').length, 0);
});

test('a new parent gets three answers, then a 403 with code free_limit', async () => {
  const rc = fakeRevenueCat();
  const opts = { env: ENFORCED, fetchImpl: rc.fetchImpl };
  const remaining = [];
  for (let i = 0; i < 3; i += 1) {
    const { denied, grant } = await checkAccess(request('u1'), CORS, opts);
    assert.equal(denied, null, `answer ${i + 1} should be allowed`);
    remaining.push(freeRemaining(await recordFreeUse(grant, opts)));
  }
  assert.deepEqual(remaining, [2, 1, 0]);
  assert.equal(rc.store.used, 3);

  const { denied } = await checkAccess(request('u1'), CORS, opts);
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: 'subscription required', code: 'free_limit', free_limit: 3 });
});

test('the count survives a cold start because it lives on the subscriber', async () => {
  const rc = fakeRevenueCat({ used: 3 });
  const { denied } = await checkAccess(request('u1'), CORS, { env: ENFORCED, fetchImpl: rc.fetchImpl });
  assert.equal(denied.status, 403);
});

test('a write RevenueCat has not echoed back yet still counts on this instance', async () => {
  const rc = fakeRevenueCat();
  const stale = { ...rc, fetchImpl: async (url, init = {}) => {
    if ((init.method || 'GET') === 'POST') return new Response('{}', { status: 200 });
    return Response.json({ subscriber: { entitlements: {}, subscriber_attributes: {} } });
  } };
  const opts = { env: { ...ENFORCED, FREE_MOMENTS: '1' }, fetchImpl: stale.fetchImpl };
  const first = await checkAccess(request('u1'), CORS, opts);
  assert.equal(first.denied, null);
  await recordFreeUse(first.grant, opts);
  const second = await checkAccess(request('u1'), CORS, opts);
  assert.equal(second.denied.status, 403);
});

test('FREE_MOMENTS=0 is the old hard gate', async () => {
  const rc = fakeRevenueCat();
  const { denied } = await checkAccess(request('u1'), CORS, { env: { ...ENFORCED, FREE_MOMENTS: '0' }, fetchImpl: rc.fetchImpl });
  assert.equal(denied.status, 403);
});

test('missing X-RC-User is denied when enforced, allowed when log-only', async () => {
  const enforced = await checkAccess(request(null), CORS, { env: ENFORCED });
  assert.equal(enforced.denied.status, 403);
  assert.equal((await enforced.denied.json()).code, 'not_entitled');
  const logOnly = await checkAccess(request(null), CORS, { env: { RC_SECRET_KEY: 'sk_test' } });
  assert.equal(logOnly.denied, null);
});

test('log-only: never denies, still counts, reports no remaining', async () => {
  const rc = fakeRevenueCat({ used: 7 });
  const opts = { env: { RC_SECRET_KEY: 'sk_test' }, fetchImpl: rc.fetchImpl };
  const { denied, grant } = await checkAccess(request('u1'), CORS, opts);
  assert.equal(denied, null);
  const after = await recordFreeUse(grant, opts);
  assert.equal(rc.store.used, 8);
  assert.equal(freeRemaining(after), null);
});

test('RevenueCat unreachable: fail open', async () => {
  const rc = fakeRevenueCat({ status: 503 });
  const { denied, grant } = await checkAccess(request('u1'), CORS, { env: ENFORCED, fetchImpl: rc.fetchImpl });
  assert.equal(denied, null);
  assert.equal(grant, null);
});

test('a failed count write does not throw', async () => {
  const opts = { env: ENFORCED, fetchImpl: async () => { throw new Error('offline'); } };
  const after = await recordFreeUse({ uid: 'u1', entitled: false, used: 0, limit: 3, enforce: true }, opts);
  assert.equal(after.used, 1);
});

test('requireEntitlement still returns only the denial', async () => {
  const rc = fakeRevenueCat({ used: 3 });
  const denied = await requireEntitlement(request('u1'), CORS, { env: ENFORCED, fetchImpl: rc.fetchImpl });
  assert.equal(denied.status, 403);
});

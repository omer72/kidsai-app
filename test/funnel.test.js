import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FUNNEL_STEPS,
  flushFunnel,
  funnelBody,
  initFunnel,
  markFunnel,
  normalizeFunnelSource,
  pendingFunnelSteps,
  planFunnelStep,
  resolveFunnelUrl,
} from '../src/funnel.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    dump: () => Object.fromEntries(map),
  };
}

function recordingFetch(status = 201) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response('{}', { status });
  };
  return { fetchImpl, calls };
}

const NATIVE = { native: true, platform: 'android', url: 'https://example.test/api/funnel', appVersion: '1.0.14' };

test('a step is planned once', () => {
  const first = planFunnelStep({ steps: {} }, 'child_added');
  assert.equal(first.changed, true);
  assert.deepEqual(pendingFunnelSteps(first.state), ['child_added']);
  assert.equal(planFunnelStep(first.state, 'child_added').changed, false);
  assert.equal(planFunnelStep({ steps: {} }, 'not_a_step').changed, false);
});

test('the body carries no identifier', () => {
  const body = funnelBody({ step: 'answer_received', platform: 'ios', lang: 'he-IL', appVersion: '1.0.14', source: 'Kidsit.ai' });
  assert.deepEqual(body, { v: 1, step: 'answer_received', platform: 'ios', lang: 'he', app_version: '1.0', source: 'kidsit.ai' });
  assert.deepEqual(funnelBody({ step: 'purchase', platform: 'web', lang: 'fr' }), { v: 1, step: 'purchase' });
});

test('source is a short lowercase token or nothing', () => {
  assert.equal(normalizeFunnelSource('google-play'), 'google-play');
  assert.equal(normalizeFunnelSource('  Instagram  '), 'instagram');
  assert.equal(normalizeFunnelSource('has space'), null);
  assert.equal(normalizeFunnelSource('a'.repeat(41)), null);
  assert.equal(normalizeFunnelSource('x@y.z'), null);
  assert.equal(normalizeFunnelSource(null), null);
});

test('markFunnel sends each step once', async () => {
  const storage = memoryStorage();
  const { fetchImpl, calls } = recordingFetch();
  initFunnel({ storage });
  await markFunnel('onboarding_done', { ...NATIVE, storage, fetchImpl });
  await markFunnel('onboarding_done', { ...NATIVE, storage, fetchImpl });
  await markFunnel('child_added', { ...NATIVE, storage, fetchImpl });
  assert.deepEqual(calls.map((c) => c.body.step), ['onboarding_done', 'child_added']);
  assert.equal(calls[0].init.credentials, 'omit');
  assert.deepEqual(Object.keys(calls[0].init.headers), ['Content-Type']);
});

test('offline steps stay pending and go out later, in funnel order', async () => {
  const storage = memoryStorage();
  initFunnel({ storage });
  const offline = async () => { throw new Error('offline'); };
  await markFunnel('child_added', { ...NATIVE, storage, fetchImpl: offline });
  await markFunnel('onboarding_done', { ...NATIVE, storage, fetchImpl: offline });
  const { fetchImpl, calls } = recordingFetch();
  const result = await flushFunnel({ ...NATIVE, storage, fetchImpl });
  assert.deepEqual(result.sent, ['onboarding_done', 'child_added']);
  assert.deepEqual(calls.map((c) => c.body.step), ['onboarding_done', 'child_added']);
  assert.deepEqual((await flushFunnel({ ...NATIVE, storage, fetchImpl })).sent, []);
});

test('a 5xx is retried, a 4xx is dropped', async () => {
  const storage = memoryStorage();
  initFunnel({ storage });
  await markFunnel('moment_sent', { ...NATIVE, storage, fetchImpl: recordingFetch(503).fetchImpl });
  const retry = recordingFetch(400);
  await flushFunnel({ ...NATIVE, storage, fetchImpl: retry.fetchImpl });
  assert.equal(retry.calls.length, 1);
  const after = recordingFetch();
  await flushFunnel({ ...NATIVE, storage, fetchImpl: after.fetchImpl });
  assert.equal(after.calls.length, 0);
});

test('web never sends', async () => {
  const storage = memoryStorage();
  const { fetchImpl, calls } = recordingFetch();
  initFunnel({ storage });
  await markFunnel('onboarding_done', { ...NATIVE, native: false, storage, fetchImpl });
  assert.equal(calls.length, 0);
});

test('an install that onboarded on an older version reports nothing', async () => {
  const storage = memoryStorage();
  const { fetchImpl, calls } = recordingFetch();
  initFunnel({ existingInstall: true, storage });
  await markFunnel('moment_sent', { ...NATIVE, storage, fetchImpl });
  assert.equal(calls.length, 0);
  // A later launch must not turn it back into a fresh install.
  initFunnel({ existingInstall: false, storage });
  await markFunnel('moment_sent', { ...NATIVE, storage, fetchImpl });
  assert.equal(calls.length, 0);
});

test('step list and URL', () => {
  assert.deepEqual([...FUNNEL_STEPS], [
    'onboarding_done', 'child_added', 'moment_sent', 'answer_received',
    'moment_rated', 'paywall_shown', 'paywall_dismissed', 'purchase',
  ]);
  assert.equal(resolveFunnelUrl(''), 'https://kidsit.ai/api/funnel');
  assert.equal(resolveFunnelUrl(' https://preview.test/api/funnel/ '), 'https://preview.test/api/funnel');
  assert.equal(resolveFunnelUrl('off'), '');
});

test('VITE_FUNNEL_URL=off sends nothing', async () => {
  const storage = memoryStorage();
  const { fetchImpl, calls } = recordingFetch();
  initFunnel({ storage });
  await markFunnel('onboarding_done', { ...NATIVE, url: '', storage, fetchImpl });
  assert.equal(calls.length, 0);
});

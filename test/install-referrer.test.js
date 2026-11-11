import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInstallReferrer, readInstallReferrer, referrerAttributes, storedInstallSource } from '../src/installReferrer.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)); } };
}

test('parses the referrer the website builds', () => {
  const parsed = parseInstallReferrer('utm_source=kidsit.ai&utm_medium=home&utm_campaign=he-home&utm_content=hero');
  assert.deepEqual(parsed, { source: 'kidsit.ai', medium: 'home', campaign: 'he-home', content: 'hero' });
  assert.deepEqual(referrerAttributes(parsed), {
    $mediaSource: 'kidsit.ai', $campaign: 'he-home', $adGroup: 'home', $creative: 'hero',
  });
});

test('organic Play installs are attributed too', () => {
  const parsed = parseInstallReferrer('utm_source=google-play&utm_medium=organic');
  assert.deepEqual(referrerAttributes(parsed), { $mediaSource: 'google-play', $adGroup: 'organic' });
});

test('click ids and odd values are dropped', () => {
  const parsed = parseInstallReferrer('utm_source=instagram&gclid=abc123&utm_campaign=has%20space&utm_content=<script>');
  assert.deepEqual(parsed, { source: 'instagram', medium: null, campaign: null, content: null });
  assert.deepEqual(referrerAttributes(parsed), { $mediaSource: 'instagram' });
  assert.deepEqual(referrerAttributes(parseInstallReferrer('')), {});
  assert.deepEqual(referrerAttributes(null), {});
});

test('reads once on Android and caches the parsed values', async () => {
  const storage = memoryStorage();
  let reads = 0;
  const plugin = { getReferrer: async () => { reads += 1; return { referrer: 'utm_source=tiktok&utm_campaign=launch' }; } };
  const first = await readInstallReferrer({ platform: 'android', storage, plugin });
  const second = await readInstallReferrer({ platform: 'android', storage, plugin });
  assert.equal(first.source, 'tiktok');
  assert.deepEqual(second, first);
  assert.equal(reads, 1);
  assert.equal(storedInstallSource(storage), 'tiktok');
});

test('iOS and plugin failures return null without caching', async () => {
  const storage = memoryStorage();
  assert.equal(await readInstallReferrer({ platform: 'ios', storage, plugin: { getReferrer: async () => ({ referrer: 'x' }) } }), null);
  const failing = { getReferrer: async () => { throw new Error('no play services'); } };
  assert.equal(await readInstallReferrer({ platform: 'android', storage, plugin: failing }), null);
  assert.equal(storedInstallSource(storage), null);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_LINK_STORAGE_KEY,
  SITE_FUNNEL_SOURCE,
  captureAppLink,
  navigationForAppLink,
  parseAppLink,
  readAppLink,
  resolveFunnelSource,
  routeForAppLink,
  sourceToken,
} from '../src/appLinks.js';
import { initFunnel, markFunnel, normalizeFunnelSource } from '../src/funnel.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    dump: () => Object.fromEntries(map),
  };
}

function recordingFetch(status = 201) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response('{}', { status });
  };
  return { fetchImpl, calls };
}

const NATIVE = { native: true, platform: 'ios', url: 'https://example.test/api/funnel', appVersion: '1.0.17' };
const ALLOWED_FIELDS = ['v', 'step', 'platform', 'lang', 'app_version', 'source', 'entry'];

test('source tokens match the funnel source rule', () => {
  for (const raw of ['Kidsit.AI', '  Instagram  ', 'he-home-banner', 'has space', 'a'.repeat(41), null, '']) {
    assert.equal(sourceToken(raw), normalizeFunnelSource(raw));
  }
});

test('blog posts and /app parse, and other URLs do not', () => {
  const he = parseAppLink('https://kidsit.ai/he/blog/yeled-marbitz');
  assert.equal(he.kind, 'blog');
  assert.equal(he.lang, 'he');
  assert.equal(he.page, 'yeled-marbitz');
  assert.deepEqual(routeForAppLink(he), { tab: 'home', stage: 'compose' });

  const en = parseAppLink('https://kidsit.ai/en/blog/toddler-wont-hug-relatives/');
  assert.equal(en.kind, 'blog');
  assert.equal(en.lang, 'en');
  assert.equal(en.page, 'toddler-wont-hug-relatives');

  const index = parseAppLink('https://kidsit.ai/he/blog');
  assert.equal(index.kind, 'blog');
  assert.equal(index.page, null);

  const app = parseAppLink('https://kidsit.ai/app?l=he&p=yeled-marbitz&ct=he-yeled-marbitz-qr');
  assert.equal(app.kind, 'app');
  assert.equal(app.lang, 'he');
  assert.equal(app.page, 'yeled-marbitz');
  assert.equal(app.ct, 'he-yeled-marbitz-qr');
  assert.deepEqual(routeForAppLink(app), { tab: 'home', stage: 'compose' });

  assert.equal(parseAppLink('https://www.kidsit.ai/app'), null);
  assert.equal(parseAppLink('http://kidsit.ai/app'), null);
  assert.equal(parseAppLink('https://kidsit.ai/apple'), null);
  assert.equal(parseAppLink('https://kidsit.ai/app/extra'), null);
  assert.equal(parseAppLink('https://kidsit.ai/he/blogfoo'), null);
  assert.equal(parseAppLink('https://evil.kidsit.ai/app'), null);
  assert.equal(parseAppLink('https://kidsit.ai.evil.com/app'), null);
  assert.equal(parseAppLink('kidsit://app'), null);
  assert.equal(routeForAppLink(null), null);
});

test('l, p, ct, and utm_* are captured; query wins over the path', () => {
  const link = parseAppLink(
    'https://kidsit.ai/en/blog/other?l=he&p=Yeled-Marbitz&ct=HE-Hero&utm_source=Instagram&utm_medium=blog&utm_campaign=he-yeled-marbitz&utm_content=inline&gclid=abc',
  );
  assert.equal(link.lang, 'he');
  assert.equal(link.page, 'yeled-marbitz');
  assert.equal(link.ct, 'he-hero');
  assert.deepEqual(link.utm, {
    source: 'instagram',
    medium: 'blog',
    campaign: 'he-yeled-marbitz',
    content: 'inline',
  });
  assert.equal(link.gclid, undefined);

  const dropped = parseAppLink('https://kidsit.ai/app?l=fr&p=has%20space&ct=bad%20ct&utm_source=x@y&utm_content=<script>');
  assert.equal(dropped.lang, null);
  assert.equal(dropped.page, null);
  assert.equal(dropped.ct, null);
  assert.deepEqual(dropped.utm, { source: null, medium: null, campaign: null, content: null });
});

test('routing stays on an in-progress moment and starts one otherwise', () => {
  assert.deepEqual(navigationForAppLink({ stage: 'compose', story: '' }), {
    tab: 'home',
    flow: { stage: 'compose', story: '', ctx: null, response: null, error: null },
  });
  assert.equal(navigationForAppLink({ stage: 'compose', story: 'she hit her brother' }).flow, null);
  assert.equal(navigationForAppLink({ stage: 'thinking', story: '' }).flow, null);
  assert.equal(navigationForAppLink({ stage: 'response' }).flow, null);
  assert.equal(navigationForAppLink({ stage: 'followup' }).tab, 'home');
});

test('the first link is kept unless a later one names a real channel', () => {
  const storage = memoryStorage();
  const first = captureAppLink('https://kidsit.ai/app?l=he&p=home&ct=he-home-qr', storage);
  assert.deepEqual(first, { tab: 'home', stage: 'compose' });
  captureAppLink('https://kidsit.ai/he/blog/other?l=en&p=other', storage);
  assert.equal(readAppLink(storage).ct, 'he-home-qr');
  assert.equal(readAppLink(storage).page, 'home');

  captureAppLink('https://kidsit.ai/he/blog/yeled-marbitz?utm_source=google&utm_medium=cpc&utm_campaign=spring&utm_content=hero', storage);
  const stored = readAppLink(storage);
  assert.equal(stored.utm.source, 'google');
  assert.equal(stored.utm.medium, 'cpc');
  assert.equal(stored.utm.campaign, 'spring');
  assert.equal(stored.utm.content, 'hero');
  assert.equal(stored.page, 'yeled-marbitz');

  captureAppLink('https://kidsit.ai/app?utm_source=instagram', storage);
  assert.equal(readAppLink(storage).utm.source, 'google');
  assert.equal(storage.dump()[APP_LINK_STORAGE_KEY].includes('"google"'), true);
});

test('funnel source precedence', () => {
  const generic = parseAppLink('https://kidsit.ai/app?l=en&p=home');
  const withCt = parseAppLink('https://kidsit.ai/app?ct=en-home-qr&l=en&p=home');
  const google = parseAppLink('https://kidsit.ai/he/blog/yeled-marbitz?utm_source=google&utm_content=inline');
  const siteUtm = parseAppLink('https://kidsit.ai/en/blog/toddler-wont-hug-relatives?utm_source=kidsit.ai&utm_medium=blog&utm_campaign=toddler-wont-hug-relatives&utm_content=inline');

  assert.equal(resolveFunnelSource({}), null);
  assert.equal(resolveFunnelSource({ install: 'tiktok' }), 'tiktok');
  assert.equal(resolveFunnelSource({ install: 'tiktok', link: google }), 'tiktok');
  assert.equal(resolveFunnelSource({ install: 'Kidsit.AI', link: google }), 'google');
  assert.equal(resolveFunnelSource({ install: 'kidsit.ai', link: withCt }), 'kidsit.ai');
  assert.equal(resolveFunnelSource({ install: 'kidsit.ai', link: siteUtm }), 'kidsit.ai');
  assert.equal(resolveFunnelSource({ link: generic }), SITE_FUNNEL_SOURCE);
  assert.equal(resolveFunnelSource({ link: withCt }), 'en-home-qr');
  assert.equal(resolveFunnelSource({ link: google }), 'google');
  assert.equal(resolveFunnelSource({ link: siteUtm }), 'kidsit.ai');
  assert.equal(resolveFunnelSource({ explicit: 'newsletter', install: 'tiktok', link: google }), 'newsletter');
  assert.equal(resolveFunnelSource({ explicit: 'not a token', install: 'tiktok' }), 'tiktok');
});

test('a captured link sets funnel source and adds no extra body fields', async () => {
  const storage = memoryStorage();
  captureAppLink(
    'https://kidsit.ai/he/blog/yeled-marbitz?l=he&p=yeled-marbitz&ct=he-yeled-marbitz-inline&utm_medium=blog&utm_campaign=he-yeled-marbitz&utm_content=inline',
    storage,
  );
  initFunnel({ storage });
  const { fetchImpl, calls } = recordingFetch();
  await markFunnel('onboarding_done', { ...NATIVE, storage, fetchImpl });
  assert.equal(calls.length, 1);
  // No utm_source on the URL, so the ct token is the source. l, p, and the
  // other utm_* values stay in the on-device record.
  assert.equal(calls[0].body.source, 'he-yeled-marbitz-inline');
  for (const key of Object.keys(calls[0].body)) assert.ok(ALLOWED_FIELDS.includes(key), key);
  assert.equal(calls[0].body.ct, undefined);
  assert.equal(calls[0].body.page, undefined);
  assert.equal(calls[0].body.entry, undefined);

  const stored = readAppLink(storage);
  assert.equal(stored.lang, 'he');
  assert.equal(stored.page, 'yeled-marbitz');
  assert.equal(stored.ct, 'he-yeled-marbitz-inline');
  assert.equal(stored.utm.medium, 'blog');
  assert.equal(stored.utm.campaign, 'he-yeled-marbitz');
  assert.equal(stored.utm.content, 'inline');
});

test('a specific link channel replaces only the generic install source', async () => {
  const storage = memoryStorage({
    'kidai.installReferrer.v1': JSON.stringify({ source: 'kidsit.ai', medium: 'blog', content: 'inline' }),
  });
  captureAppLink('https://kidsit.ai/app?l=he&p=home&utm_source=google&utm_medium=cpc&utm_campaign=spring&utm_content=qr', storage);
  initFunnel({ storage });
  const { fetchImpl, calls } = recordingFetch();
  await markFunnel('onboarding_done', { ...NATIVE, storage, fetchImpl });
  assert.equal(calls[0].body.source, 'google');
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['app_version', 'lang', 'platform', 'source', 'step', 'v']);

  const kept = memoryStorage({
    'kidai.installReferrer.v1': JSON.stringify({ source: 'tiktok' }),
  });
  captureAppLink('https://kidsit.ai/app?utm_source=google', kept);
  initFunnel({ storage: kept });
  const again = recordingFetch();
  await markFunnel('child_added', { ...NATIVE, storage: kept, fetchImpl: again.fetchImpl });
  assert.equal(again.calls[0].body.source, 'tiktok');
});

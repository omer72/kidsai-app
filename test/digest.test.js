import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COUNT_CAP,
  NAME_TOKEN,
  nameToken,
  aggregateDigest,
  buildInsightsPayload,
  capacitorWeekday,
  digestConfig,
  isoWeekKey,
  minorVersion,
  notificationBody,
  renderPoint,
  scrubPII,
  selectPoints,
} from '../src/digest.js';
import { fallbackAppVersion, insightsRequest, resolveAppVersion, resolveInsightsUrl } from '../src/insights.js';
import { readStoreVersion } from '../scripts/store-version.mjs';
import { classifySituation, normalizeGuidance } from '../src/taxonomy.js';
import en from '../src/i18n/en.json' with { type: 'json' };
import es from '../src/i18n/es.json' with { type: 'json' };
import he from '../src/i18n/he.json' with { type: 'json' };

function ts(y, m, d, h = 12, min = 0) {
  return new Date(y, m - 1, d, h, min, 0, 0).getTime();
}

function withMoves(moves) {
  return { sections: [{ kind: 'try', items: moves.map((move) => ({ h: 'x', b: 'y', move })) }] };
}

function moment(partial) {
  return {
    kidId: 'k1',
    feedback: null,
    story: '',
    title: '',
    where: null,
    mood: null,
    ...partial,
  };
}

const NOW = new Date(2026, 10, 1, 15, 0, 0, 0); // Sunday 1 Nov 2026, local
const IN_WEEK = ts(2026, 10, 28, 20, 0); // Wednesday evening of that ISO week
const BEFORE_WEEK = ts(2026, 10, 25, 23, 0); // Sunday before the Monday that opens the week

test('ISO week keys around year boundaries', () => {
  assert.equal(isoWeekKey(new Date(2026, 0, 1)), '2026-W01');
  assert.equal(isoWeekKey(new Date(2025, 11, 29)), '2026-W01');
  assert.equal(isoWeekKey(new Date(2026, 11, 31)), '2026-W53');
  assert.match(isoWeekKey(NOW), /^\d{4}-W\d{2}$/);
});

test('capacitor weekday maps Sunday=1 and Friday=6', () => {
  assert.equal(capacitorWeekday(0), 1);
  assert.equal(capacitorWeekday(5), 6);
  assert.equal(capacitorWeekday(6), 7);
  assert.equal(digestConfig({}).weekday, 5);
  assert.equal(digestConfig({}).hour, 9);
  assert.equal(digestConfig({}).enabled, false);
});

test('same counts as not worked; only better and great count as worked', () => {
  const history = [
    moment({ id: IN_WEEK, feedback: 'same', situation: 'bedtime_sleep', response: withMoves(['choice']) }),
    moment({ id: IN_WEEK + 1, feedback: 'worse', situation: 'bedtime_sleep', response: withMoves(['choice']) }),
    moment({ id: IN_WEEK + 2, feedback: 'better', situation: 'bedtime_sleep', response: withMoves(['choice']) }),
    moment({ id: IN_WEEK + 3, feedback: 'great', situation: 'transitions', response: withMoves(['name_feeling']) }),
    moment({ id: IN_WEEK + 4, feedback: null, situation: 'transitions' }),
    moment({ id: IN_WEEK + 5, kidId: 'k2', feedback: 'great', situation: 'eating', response: withMoves(['choice']) }),
    moment({ id: BEFORE_WEEK, feedback: 'great', situation: 'eating', response: withMoves(['choice']) }),
  ];
  const agg = aggregateDigest(history, { kidId: 'k1', cadence: 'week', now: NOW });
  assert.equal(agg.total, 5);
  const sleep = agg.situations.bedtime_sleep;
  assert.deepEqual(
    { great: sleep.great, better: sleep.better, same: sleep.same, worse: sleep.worse, unrated: sleep.unrated },
    { great: 0, better: 1, same: 1, worse: 1, unrated: 0 },
  );
  assert.equal(sleep.better + sleep.great, 1);
  assert.equal(sleep.same + sleep.worse, 2);
  assert.equal(agg.moves.choice.worked, 1);
  assert.equal(agg.moves.choice.not_worked, 2);
  assert.equal(agg.moves.name_feeling.worked, 1);
  assert.equal(agg.moves.name_feeling.not_worked, 0);
  assert.equal(agg.situations.eating, undefined);
});

test('old entries without a situation stay unclassified unless a keyword hits', () => {
  const unknown = moment({ id: IN_WEEK, story: 'hello there', feedback: 'better' });
  const bedtime = moment({ id: IN_WEEK + 1, story: 'bedtime was a battle', feedback: 'same' });
  assert.equal(classifySituation(unknown), 'unclassified');
  assert.equal(classifySituation(bedtime), 'bedtime_sleep');
  assert.equal(classifySituation({ ...bedtime, situation: 'screens' }), 'screens');
  const agg = aggregateDigest([unknown, bedtime], { kidId: 'k1', cadence: 'week', now: NOW });
  assert.equal(agg.situations.unclassified.better, 1);
  assert.equal(agg.situations.bedtime_sleep.same, 1);
});

test('keyword match does not fire inside a longer word', () => {
  assert.equal(classifySituation(moment({ story: 'parking lot only' })), 'unclassified');
  assert.equal(classifySituation(moment({ story: 'we left the park' })), 'transitions');
});

test('daily window still reports an ISO week key', () => {
  const today = ts(2026, 11, 1, 9, 0);
  const yesterday = ts(2026, 10, 31, 21, 0);
  const history = [
    moment({ id: today, feedback: 'same', situation: 'eating' }),
    moment({ id: yesterday, feedback: 'great', situation: 'eating' }),
  ];
  const agg = aggregateDigest(history, { kidId: 'k1', cadence: 'day', now: NOW });
  assert.equal(agg.period, 'day');
  assert.equal(agg.total, 1);
  assert.equal(agg.situations.eating.same, 1);
  assert.equal(agg.periodKey, isoWeekKey(NOW));
  assert.match(agg.periodKey, /^\d{4}-W\d{2}$/);
});

test('points need two cases, and same feeds the not-worked move', () => {
  const one = [moment({
    id: IN_WEEK, feedback: 'same', situation: 'limits_cooperation', response: withMoves(['choice', 'choice']),
  })];
  assert.equal(selectPoints(one).length, 0);

  const two = [0, 1].map((n) => moment({
    id: IN_WEEK + n,
    feedback: 'same',
    situation: 'limits_cooperation',
    where: 'public',
    response: withMoves(['acknowledge']),
  }));
  const points = selectPoints(two);
  assert.deepEqual(points[0], { kind: 'move_not_worked', move: 'acknowledge', count: 2 });
  assert.equal(points.some((p) => p.kind === 'move_worked'), false);
});

test('at most three points, in priority order', () => {
  const entries = [];
  for (let i = 0; i < 2; i += 1) {
    entries.push(moment({
      id: ts(2026, 10, 27, 20, i),
      feedback: 'better',
      where: 'car',
      mood: 'tired',
      response: withMoves(['choice']),
    }));
  }
  for (let i = 0; i < 2; i += 1) {
    entries.push(moment({
      id: ts(2026, 10, 28, 21, i),
      feedback: 'same',
      where: 'car',
      mood: 'tired',
      response: withMoves(['acknowledge']),
    }));
  }
  entries.push(moment({ id: ts(2026, 10, 29, 12), feedback: null }));
  entries.push(moment({ id: ts(2026, 10, 29, 13), feedback: null }));
  const points = selectPoints(entries);
  assert.equal(points.length, 3);
  assert.equal(points[0].kind, 'move_worked');
  assert.equal(points[1].kind, 'move_not_worked');
  assert.equal(points[2].kind, 'night');
  assert.equal(points[2].matched, 2);
});

test('unknown model values collapse to other', () => {
  const normalized = normalizeGuidance({
    title: 't',
    situation: 'made-up',
    sections: [{ kind: 'try', items: [{ h: 'a', b: 'b', move: 'nope' }, { h: 'c', b: 'd', move: 'choice' }] }],
  });
  assert.equal(normalized.situation, 'other');
  assert.deepEqual(normalized.sections[0].items.map((item) => item.move), ['other', 'choice']);
});

test('scrubber removes names with Hebrew prefixes, plus contact details', () => {
  const kids = [{ name: 'נועה' }, { name: 'Noa' }, { name: 'א' }, { name: 'דן' }];
  const input = [
    'ונועה הלכה עם הנועה',
    'שנועה בנועה לנועה מנועה כנועה',
    'והנועה',
    'דן הלך, דני נשאר',
    'email me at parent@example.com',
    'call 052-1234567 or 0521234567 or +972-52-1234567 or +972521234567',
    'see https://example.com/path?q=1 and www.kidsit.ai',
    'id 123456789',
    'on 01/11/2026 and 2026-11-01',
    'NOA waved',
  ].join(' ');
  const out = scrubPII(input, kids, { lang: 'he' });
  for (const prefix of ['ו', 'ה', 'ש', 'ב', 'ל', 'מ', 'כ']) {
    assert.equal(out.includes(`${prefix}נועה`), false, prefix);
    assert.match(out, new RegExp(`${prefix}\\[ילד\\]`), prefix);
  }
  assert.match(out, /וה\[ילד\]/);
  assert.equal(out.includes('והנועה'), false);
  assert.equal(out.includes('נועה'), false);
  assert.match(out, /דני נשאר/);
  assert.equal(out.includes('דן'), false);
  assert.equal(out.includes('Noa') || out.includes('NOA'), false);
  assert.equal(out.includes('parent@example.com'), false);
  assert.equal(out.includes('@'), false);
  assert.equal(out.includes('052'), false);
  assert.equal(out.includes('+972'), false);
  assert.equal(out.includes('http'), false);
  assert.equal(out.includes('www.'), false);
  assert.equal(out.includes('123456789'), false);
  assert.equal(out.includes('2026'), false);
  assert.match(out, new RegExp(NAME_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(out, /\[email\]/);
  assert.match(out, /\[phone\]/);
  assert.match(out, /\[url\]/);
  assert.match(out, /\[id\]/);
  assert.match(out, /\[date\]/);
  assert.equal(scrubPII('אבא', [{ name: 'א' }]), 'אבא');
});

test('name token follows the payload language', () => {
  const kids = [{ name: 'Noa' }, { name: 'נועה' }];
  assert.equal(nameToken('en'), '[child]');
  assert.equal(nameToken('en-US'), '[child]');
  assert.equal(nameToken('es'), '[niño/a]');
  assert.equal(nameToken('he'), '[ילד]');
  assert.equal(nameToken('he'), NAME_TOKEN);
  assert.equal(scrubPII('Noa cried', kids, { lang: 'en' }), '[child] cried');
  assert.equal(scrubPII('Noa lloró', kids, { lang: 'es-ES' }), '[niño/a] lloró');
  assert.equal(scrubPII('נועה בכתה', kids, { lang: 'he-IL' }), '[ילד] בכתה');
  const { payload } = buildInsightsPayload({
    history: [],
    kidId: 'k1',
    now: NOW,
    lang: 'es',
    platform: 'ios',
    freeText: 'hoy Noa',
    kids,
    includeSituations: false,
    includeMoves: false,
    includeRating: false,
  });
  assert.equal(payload.lang, 'es');
  assert.equal(payload.free_text, 'hoy [niño/a]');
});

test('Hebrew name prefixes are kept and ordinary words are not rewritten', () => {
  const kids = [{ name: 'נועה' }];
  const opt = { lang: 'he' };
  assert.equal(scrubPII('ולנועה באה', kids, opt), 'ול[ילד] באה');
  assert.equal(scrubPII('לנועה באה', kids, opt), 'ל[ילד] באה');
  assert.equal(scrubPII('ונועה באה', kids, opt), 'ו[ילד] באה');
  assert.equal(scrubPII('ושנועה באה', kids, opt), 'וש[ילד] באה');
  assert.equal(scrubPII('כשנועה באה', kids, opt), 'כש[ילד] באה');
  assert.equal(scrubPII('מהנועה באה', kids, opt), 'מה[ילד] באה');
  for (const prefix of ['ה', 'ב', 'כ', 'מ', 'ש']) {
    assert.equal(scrubPII(`${prefix}נועה באה`, kids, opt), `${prefix}[ילד] באה`, prefix);
  }
  assert.equal(scrubPII('התנועה נמשכת', kids, opt), 'התנועה נמשכת');
  assert.equal(scrubPII('דני נשאר', [{ name: 'דן' }], opt), 'דני נשאר');
  assert.equal(scrubPII('דן הלך', [{ name: 'דן' }], opt), '[ילד] הלך');
});

test('free text is capped at 500 characters', () => {
  const out = scrubPII('א'.repeat(800), []);
  assert.equal([...out].length, 500);
});

test('payload matches the v1 schema and drops identifiers', () => {
  const history = [];
  for (let i = 0; i < 31; i += 1) {
    history.push(moment({
      id: IN_WEEK + i,
      feedback: i % 5 === 0 ? 'great' : i % 5 === 1 ? 'better' : i % 5 === 2 ? 'same' : i % 5 === 3 ? 'worse' : null,
      situation: i % 2 === 0 ? 'bedtime_sleep' : 'transitions',
      story: 'נועה at the park',
      response: withMoves(['choice']),
    }));
  }
  history.push(moment({ id: IN_WEEK + 100, story: 'nothing useful', feedback: 'better' }));
  const kids = [{ name: 'נועה' }, { name: 'איתי' }];
  const { payload } = buildInsightsPayload({
    history,
    kidId: 'k1',
    cadence: 'week',
    now: NOW,
    lang: 'he-IL',
    platform: 'ios',
    appVersion: '1.0.13',
    rating: 4,
    freeText: 'הסיכום עזר לי לראות את ונועה. מייל a@b.co טלפון 052-1234567',
    kids,
  });
  assert.deepEqual(Object.keys(payload), [
    'schema_v', 'taxonomy_v', 'period', 'period_key', 'lang', 'platform', 'app_version',
    'situations', 'moves', 'rating', 'free_text', 'free_text_scrubbed',
  ]);
  assert.equal(payload.schema_v, 1);
  assert.equal(payload.taxonomy_v, 1);
  assert.equal(payload.period, 'week');
  assert.equal(payload.period_key, isoWeekKey(NOW));
  assert.equal(payload.lang, 'he');
  assert.equal(payload.platform, 'ios');
  assert.equal(payload.app_version, '1.0');
  assert.equal(payload.rating, 4);
  assert.equal(payload.free_text_scrubbed, true);
  assert.equal(payload.free_text.includes('נועה'), false);
  assert.equal(payload.free_text.includes('@'), false);
  assert.equal(payload.free_text.includes('052'), false);
  const sleep = payload.situations.find((row) => row.type === 'bedtime_sleep');
  assert.ok(sleep);
  assert.deepEqual(Object.keys(sleep), ['type', 'great', 'better', 'same', 'worse', 'unrated']);
  assert.ok(sleep.great <= COUNT_CAP && sleep.better <= COUNT_CAP && sleep.same <= COUNT_CAP);
  assert.equal(payload.situations.some((row) => row.type === 'unclassified'), false);
  assert.equal(payload.moves[0].move, 'choice');
  assert.ok(payload.moves[0].not_worked > 0);
  const blob = JSON.stringify(payload);
  assert.doesNotMatch(blob, /kidId|X-RC-User|revenuecat|נועה|a@b\.co/i);
});

test('counts in the payload clamp at 30', () => {
  const history = Array.from({ length: 35 }, (_, i) => moment({
    id: IN_WEEK + i,
    feedback: 'same',
    situation: 'eating',
    response: withMoves(['hint']),
  }));
  const { payload } = buildInsightsPayload({ history, kidId: 'k1', cadence: 'week', now: NOW });
  assert.equal(payload.situations[0].same, COUNT_CAP);
  assert.equal(payload.moves[0].not_worked, COUNT_CAP);
  assert.equal(payload.moves[0].worked, 0);
});

test('optional payload parts can be removed, and counts can be emptied', () => {
  const history = [moment({ id: IN_WEEK, feedback: 'better', situation: 'screens', response: withMoves(['hint']) })];
  const { payload } = buildInsightsPayload({
    history,
    kidId: 'k1',
    now: NOW,
    includeSituations: false,
    includeMoves: false,
    includeRating: false,
    includeFreeText: false,
    rating: 9,
    freeText: 'secret',
  });
  assert.deepEqual(payload.situations, []);
  assert.equal('moves' in payload, false);
  assert.equal('rating' in payload, false);
  assert.equal('free_text' in payload, false);
  assert.equal('free_text_scrubbed' in payload, false);
});

test('insights app version is the installed version, major.minor only', async () => {
  assert.equal(readStoreVersion(), '1.0.14');
  const fromNative = await resolveAppVersion({
    native: true,
    getInfo: async () => ({ version: '1.0.13', build: '9' }),
    buildVersion: '9.9.9',
  });
  assert.equal(fromNative, '1.0.13');
  assert.equal(minorVersion(fromNative), '1.0');

  let called = false;
  const fromBrowser = await resolveAppVersion({
    native: false,
    getInfo: async () => { called = true; return { version: '9.9.9' }; },
    buildVersion: '1.0.13',
  });
  assert.equal(called, false);
  assert.equal(fromBrowser, '1.0.13');

  const fromFailedPlugin = await resolveAppVersion({
    native: true,
    getInfo: async () => { throw new Error('bridge down'); },
    buildVersion: '1.0.13',
  });
  assert.equal(fromFailedPlugin, '1.0.13');

  const emptyNative = await resolveAppVersion({
    native: true,
    getInfo: async () => ({ version: '   ' }),
    buildVersion: '1.0.13',
  });
  assert.equal(emptyNative, '1.0.13');

  const { payload } = buildInsightsPayload({ appVersion: fromNative });
  assert.equal(payload.app_version, '1.0');
  assert.equal(Object.hasOwn(payload, 'build'), false);
  assert.equal(fallbackAppVersion() === '' || fallbackAppVersion() === '1.0.13', true);
});

test('insights request carries no auth header and the URL is configurable', () => {
  const init = insightsRequest({ schema_v: 1 });
  assert.deepEqual(Object.keys(init.headers), ['Content-Type']);
  assert.equal(init.credentials, 'omit');
  assert.equal(init.method, 'POST');
  assert.equal(resolveInsightsUrl(undefined), 'https://kidsit.ai/api/insights');
  assert.equal(resolveInsightsUrl(''), 'https://kidsit.ai/api/insights');
  assert.equal(resolveInsightsUrl('https://preview.example/api/insights/'), 'https://preview.example/api/insights');
});

test('notification copy is generic in Hebrew and English', () => {
  for (const body of [notificationBody('week', 'he'), notificationBody('day', 'en'), notificationBody('week', 'es')]) {
    assert.ok(body.length > 0);
    assert.equal(body.includes('{{'), false);
    assert.doesNotMatch(body, /\{\{name\}\}/);
  }
  assert.doesNotMatch(JSON.stringify(he.digest), /צריך/);
  assert.doesNotMatch(JSON.stringify(en.digest), /\bshould\b/i);
  const hePoint = renderPoint({ kind: 'move_worked', move: 'choice', count: 2 }, 'he');
  assert.match(hePoint, /שני/);
  assert.match(hePoint, /בחירה/);
  const enPoint = renderPoint({ kind: 'move_not_worked', move: 'choice', count: 3 }, 'en');
  assert.match(enPoint, /3/);
  assert.match(enPoint, /choice/i);
});

test('consent copy limits guidance to the current child and still names RevenueCat', () => {
  for (const bag of [en.aiConsent, he.aiConsent, es.aiConsent]) {
    const text = `${bag.bullet2} ${bag.settingsHintEnabled} ${bag.bullet3} ${bag.body1}`;
    assert.match(text, /RevenueCat|X-RC-User/);
    assert.match(bag.bullet2, /היסטוריה האחרונה|recent history|historial reciente/i);
    assert.match(bag.bullet2, /הילד הנוכחי|this child's|niño actual/i);
    assert.match(bag.bullet2, /ילדים אחרים|other children|demás niños/i);
    assert.doesNotMatch(bag.bullet2, /every child|כל הילדים|cada niño/i);
    assert.doesNotMatch(bag.bullet2, /siblings \(name|אחים והאחיות \(שם|hermanos \(nombre/i);
    assert.match(bag.body1, /OpenAI/);
  }
  assert.match(en.aiConsent.bullet2, /intake|notes/i);
  assert.match(en.aiConsent.settingsHintEnabled, /Other children are not included/);
  assert.match(he.aiConsent.bullet2, /הילד הנוכחי/);
  assert.match(he.aiConsent.settingsHintEnabled, /ילדים אחרים לא נכללים/);
  assert.match(es.aiConsent.settingsHintEnabled, /Los demás niños no se incluyen/);
  assert.match(he.aiConsent.bullet3, /X-RC-User/);
  assert.match(en.aiConsent.bullet3, /anonymous insights/);
  assert.match(he.aiConsent.bullet3, /תובנות אנונימיות/);
});

test('Kidsit price phrases stay unchanged', () => {
  assert.equal(en.subscription.switchToMonthlyDetail, '$9.99/month');
  assert.equal(en.subscription.switchToYearlyDetail, 'Save 51% · $59.99/year');
  assert.equal(en.subscription.yearlyPriceLine, '$59.99/year');
  assert.equal(en.subscription.monthlyPriceLine, '$9.99/month');
  assert.equal(he.subscription.switchToMonthlyDetail, '$9.99/חודש');
  assert.equal(he.subscription.switchToYearlyDetail, 'חסכו 51% · $59.99/שנה');
  assert.equal(he.subscription.yearlyPriceLine, '$59.99/שנה');
  assert.equal(he.subscription.monthlyPriceLine, '$9.99/חודש');
  assert.equal(es.subscription.switchToMonthlyDetail, '$9,99/mes');
  assert.equal(es.subscription.switchToYearlyDetail, 'Ahorra 51% · $59,99/año');
  assert.equal(es.subscription.yearlyPriceLine, '$59,99/año');
  assert.equal(es.subscription.monthlyPriceLine, '$9,99/mes');
});

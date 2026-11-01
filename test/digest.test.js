import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COUNT_CAP,
  NAME_TOKEN,
  aggregateDigest,
  buildInsightsPayload,
  capacitorWeekday,
  digestConfig,
  isoWeekKey,
  notificationBody,
  renderPoint,
  scrubPII,
  selectPoints,
} from '../src/digest.js';
import { APP_VERSION, insightsRequest, resolveInsightsUrl } from '../src/insights.js';
import pkg from '../package.json' with { type: 'json' };
import { classifySituation, normalizeGuidance } from '../src/taxonomy.js';
import en from '../src/i18n/en.json' with { type: 'json' };
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
  const out = scrubPII(input, kids);
  for (const prefix of ['ו', 'ה', 'ש', 'ב', 'ל', 'מ', 'כ']) {
    assert.equal(out.includes(`${prefix}נועה`), false, prefix);
  }
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
    appVersion: '0.1.0',
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
  assert.equal(payload.app_version, '0.1');
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

test('app version sent with insights matches package.json at minor precision', () => {
  assert.equal(APP_VERSION, pkg.version);
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

test('consent copy names the profile, siblings, history, and RevenueCat header', () => {
  for (const bag of [en.aiConsent, he.aiConsent]) {
    const text = `${bag.bullet2} ${bag.bullet3} ${bag.body1}`;
    assert.match(text, /RevenueCat|X-RC-User/);
    assert.match(bag.bullet2, /היסטוריה|history|historial/i);
  }
  assert.match(en.aiConsent.bullet2, /siblings/i);
  assert.match(en.aiConsent.bullet2, /intake|notes/i);
  assert.match(he.aiConsent.bullet2, /אחים/);
  assert.match(he.aiConsent.bullet3, /X-RC-User/);
});

// On-device digest. Counts and sentences come from fixed templates.
// There is no model call on this path.
//
// Worked = better + great. Didn't work = worse + same. Unrated = anything else.

import en from './i18n/en.json' with { type: 'json' };
import es from './i18n/es.json' with { type: 'json' };
import he from './i18n/he.json' with { type: 'json' };
import {
  MOVE_IDS,
  PUBLIC_SITUATION_IDS,
  capacitorWeekday,
  classifySituation,
} from './taxonomy.js';

export { capacitorWeekday };

const DICTS = { en, es, he };

export const COUNT_CAP = 30;
export const FREE_TEXT_MAX = 500;
// Hebrew stays [ילד]. English and Spanish use their own placeholder.
// NAME_TOKEN remains the Hebrew token for callers that already imported it.
export const NAME_TOKEN = '[ילד]';
// Attached clitics only, longest first so ול wins over ו or ל.
// Not every letter that happens to sit in front of a name: תנועה stays intact.
const HE_PREFIXES = [
  'וה', 'וש', 'וב', 'ול', 'ומ', 'וכ',
  'שה', 'שב', 'של', 'שמ', 'שכ',
  'כש', 'מה',
  'ו', 'ה', 'ש', 'ב', 'ל', 'מ', 'כ',
];

export function normalizeLang(lang) {
  const code = String(lang || 'en').toLowerCase().split('-')[0];
  return DICTS[code] ? code : 'en';
}

export function nameToken(lang) {
  const token = DICTS[normalizeLang(lang)]?.insights?.nameToken;
  return typeof token === 'string' && token ? token : NAME_TOKEN;
}

export function normalizePlatform(platform) {
  return platform === 'ios' || platform === 'android' || platform === 'web' ? platform : 'web';
}

export function minorVersion(version) {
  const match = String(version || '').trim().match(/^(\d+)\.(\d+)/);
  return match ? `${Number(match[1])}.${Number(match[2])}` : '0.0';
}

export function digestConfig(settings) {
  const digest = settings?.digest || {};
  const weekday = Number(digest.weekday);
  const hour = Number(digest.hour);
  return {
    enabled: !!digest.enabled,
    cadence: digest.cadence === 'day' ? 'day' : 'week',
    weekday: Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : 5,
    hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 9,
  };
}

function digestBag(lang) {
  return DICTS[normalizeLang(lang)].digest || {};
}

function fill(template, vars) {
  return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (
    vars[key] == null ? '' : String(vars[key])
  ));
}

function pluralForm(lang, n) {
  if (normalizeLang(lang) === 'he') {
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    return 'other';
  }
  return n === 1 ? 'one' : 'other';
}

function pluralPhrase(group, key, n, vars, lang) {
  const form = pluralForm(lang, n);
  const template = group?.[`${key}_${form}`] || group?.[`${key}_other`] || '';
  return fill(template, { ...vars, count: n });
}

export function situationLabel(id, lang) {
  return digestBag(lang).situation?.[id] || id;
}

export function moveLabel(id, lang) {
  return digestBag(lang).move?.[id] || id;
}

export function renderMomentCount(n, lang) {
  return pluralPhrase(digestBag(lang), 'momentCount', n, {}, lang);
}

export function renderPoint(point, lang) {
  const bag = digestBag(lang);
  const move = bag.move?.[point.move] || point.move || '';
  const where = bag.where?.[point.where] || point.where || '';
  const mood = bag.mood?.[point.mood] || point.mood || '';
  if (point.kind === 'move_worked') return pluralPhrase(bag.point, 'moveWorked', point.count, { move }, lang);
  if (point.kind === 'move_not_worked') return pluralPhrase(bag.point, 'moveNotWorked', point.count, { move }, lang);
  if (point.kind === 'night') return fill(bag.point?.night, { matched: point.matched, total: point.total });
  if (point.kind === 'place') return fill(bag.point?.place, { matched: point.matched, total: point.total, where });
  if (point.kind === 'mood') return fill(bag.point?.mood, { matched: point.matched, total: point.total, mood });
  if (point.kind === 'unrated') return pluralPhrase(bag.point, 'unrated', point.count, {}, lang);
  return '';
}

export function notificationBody(cadence, lang) {
  const bag = digestBag(lang);
  return cadence === 'day' ? (bag.notificationDaily || '') : (bag.notificationWeekly || '');
}

export function isoWeekKey(date) {
  const src = date instanceof Date ? date : new Date(date);
  const target = new Date(src.getFullYear(), src.getMonth(), src.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const isoYear = target.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

export function localDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function periodWindow(cadence, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  const periodKey = isoWeekKey(current);
  if (cadence === 'day') {
    const start = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
    return {
      period: 'day',
      periodKey,
      windowKey: localDateKey(current),
      start,
      end: current.getTime(),
    };
  }
  const dayNr = (current.getDay() + 6) % 7;
  const startDate = new Date(current.getFullYear(), current.getMonth(), current.getDate() - dayNr);
  return {
    period: 'week',
    periodKey,
    windowKey: periodKey,
    start: startDate.getTime(),
    end: current.getTime(),
  };
}

export function isNightHour(timestamp) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return false;
  const hour = d.getHours();
  return hour >= 19 || hour < 6;
}

export function isWorked(feedback) {
  return feedback === 'better' || feedback === 'great';
}

export function isNotWorked(feedback) {
  return feedback === 'worse' || feedback === 'same';
}

export function movesIn(entry) {
  const items = entry?.response?.sections?.find((section) => section?.kind === 'try')?.items || [];
  const seen = [];
  for (const item of items) {
    if (MOVE_IDS.has(item?.move) && !seen.includes(item.move)) seen.push(item.move);
  }
  return seen;
}

function blankSituation() {
  return { great: 0, better: 0, same: 0, worse: 0, unrated: 0 };
}

function bumpFeedback(bucket, feedback) {
  if (feedback === 'great' || feedback === 'better' || feedback === 'same' || feedback === 'worse') {
    bucket[feedback] += 1;
  } else {
    bucket.unrated += 1;
  }
}

function topCount(map) {
  let best = null;
  for (const [key, count] of Object.entries(map)) {
    if (!best || count > best.count || (count === best.count && key < best.key)) best = { key, count };
  }
  return best;
}

function contextPoint(failed) {
  const total = failed.length;
  if (total < 2) return null;
  const candidates = [];
  const night = failed.filter((entry) => isNightHour(entry.id)).length;
  if (night >= 2 && night * 2 >= total) {
    candidates.push({ kind: 'night', matched: night, total, rank: 0, label: 'night' });
  }
  const grouped = (field) => {
    const counts = {};
    for (const entry of failed) {
      const key = entry[field];
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  };
  for (const [where, matched] of Object.entries(grouped('where'))) {
    if (matched >= 2 && matched * 2 >= total) {
      candidates.push({ kind: 'place', where, matched, total, rank: 1, label: where });
    }
  }
  for (const [mood, matched] of Object.entries(grouped('mood'))) {
    if (matched >= 2 && matched * 2 >= total) {
      candidates.push({ kind: 'mood', mood, matched, total, rank: 2, label: mood });
    }
  }
  candidates.sort((a, b) => b.matched - a.matched || a.rank - b.rank || a.label.localeCompare(b.label));
  if (!candidates.length) return null;
  const top = candidates[0];
  if (top.kind === 'night') return { kind: 'night', matched: top.matched, total };
  if (top.kind === 'place') return { kind: 'place', where: top.where, matched: top.matched, total };
  return { kind: 'mood', mood: top.mood, matched: top.matched, total };
}

export function selectPoints(entries) {
  const workedMoves = {};
  const failedMoves = {};
  const failed = [];
  let unrated = 0;
  for (const entry of entries) {
    if (isWorked(entry.feedback)) {
      for (const move of movesIn(entry)) workedMoves[move] = (workedMoves[move] || 0) + 1;
    } else if (isNotWorked(entry.feedback)) {
      failed.push(entry);
      for (const move of movesIn(entry)) failedMoves[move] = (failedMoves[move] || 0) + 1;
    } else {
      unrated += 1;
    }
  }
  const points = [];
  const bestWorked = topCount(workedMoves);
  if (bestWorked && bestWorked.count >= 2) {
    points.push({ kind: 'move_worked', move: bestWorked.key, count: bestWorked.count });
  }
  const bestFailed = topCount(failedMoves);
  if (bestFailed && bestFailed.count >= 2) {
    points.push({ kind: 'move_not_worked', move: bestFailed.key, count: bestFailed.count });
  }
  const context = contextPoint(failed);
  if (context) points.push(context);
  if (unrated >= 2) points.push({ kind: 'unrated', count: unrated });
  return points.slice(0, 3);
}

function entryTime(entry) {
  const ts = typeof entry?.id === 'number' ? entry.id : Number(entry?.id);
  return Number.isFinite(ts) ? ts : null;
}

export function aggregateDigest(history, { kidId, cadence = 'week', now = new Date() } = {}) {
  const window = periodWindow(cadence, now);
  const entries = (Array.isArray(history) ? history : []).filter((entry) => {
    if (!entry || entry.kidId !== kidId) return false;
    const ts = entryTime(entry);
    return ts != null && ts >= window.start && ts <= window.end;
  });
  const situations = {};
  const moves = {};
  for (const entry of entries) {
    const type = classifySituation(entry);
    if (!situations[type]) situations[type] = blankSituation();
    bumpFeedback(situations[type], entry.feedback);
    if (isWorked(entry.feedback) || isNotWorked(entry.feedback)) {
      const worked = isWorked(entry.feedback);
      for (const move of movesIn(entry)) {
        if (!moves[move]) moves[move] = { worked: 0, not_worked: 0 };
        if (worked) moves[move].worked += 1;
        else moves[move].not_worked += 1;
      }
    }
  }
  return {
    period: window.period,
    periodKey: window.periodKey,
    windowKey: window.windowKey,
    start: window.start,
    end: window.end,
    total: entries.length,
    situations,
    moves,
    points: selectPoints(entries),
  };
}

function capCount(n) {
  const value = Number(n) || 0;
  return Math.max(0, Math.min(COUNT_CAP, value));
}

function situationRows(situations) {
  return Object.keys(situations)
    .filter((type) => type !== 'unclassified' && PUBLIC_SITUATION_IDS.has(type))
    .sort()
    .map((type) => {
      const row = situations[type];
      return {
        type,
        great: capCount(row.great),
        better: capCount(row.better),
        same: capCount(row.same),
        worse: capCount(row.worse),
        unrated: capCount(row.unrated),
      };
    })
    .filter((row) => row.great + row.better + row.same + row.worse + row.unrated > 0);
}

function moveRows(moves) {
  return Object.keys(moves)
    .filter((move) => MOVE_IDS.has(move))
    .sort()
    .map((move) => ({
      move,
      worked: capCount(moves[move].worked),
      not_worked: capCount(moves[move].not_worked),
    }))
    .filter((row) => row.worked + row.not_worked > 0);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scrubPII(text, kids, { max = FREE_TEXT_MAX, lang = 'en' } = {}) {
  const token = nameToken(lang);
  let out = String(text || '');
  out = out.replace(/https?:\/\/[^\s<>"']+/gi, '[url]');
  out = out.replace(/(^|[^\p{L}\p{N}])(www\.[^\s<>"']+)/giu, '$1[url]');
  out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
  const phones = [
    /(?<!\d)\+972[\s-]?[1-9]\d?(?:[\s-]?\d){7,8}(?!\d)/g,
    /(?<!\d)972[\s-][1-9]\d?(?:[\s-]?\d){7,8}(?!\d)/g,
    /(?<!\d)05\d(?:[\s-]?\d){7}(?!\d)/g,
    /(?<!\d)0\d[\s-]\d{3}[\s-]?\d{4}(?!\d)/g,
    /(?<!\d)\+\d{1,3}(?:[\s()-]*\d){7,14}(?!\d)/g,
    /(?<!\d)\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g,
  ];
  for (const re of phones) out = out.replace(re, '[phone]');
  out = out.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[date]');
  out = out.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, '[date]');
  out = out.replace(/(?<!\d)\d{9}(?!\d)/g, '[id]');
  const names = [];
  for (const kid of kids || []) {
    const name = String(kid?.name || '').trim();
    if ([...name].length >= 2) names.push(name);
  }
  names.sort((a, b) => [...b].length - [...a].length);
  const prefixes = HE_PREFIXES.map(escapeRegExp).join('|');
  for (const name of names) {
    const re = new RegExp(
      `(^|[^\\p{L}\\p{N}])(${prefixes})?(${escapeRegExp(name)})(?=$|[^\\p{L}\\p{N}])`,
      'giu',
    );
    out = out.replace(re, `$1$2${token}`);
  }
  out = out.trim();
  const chars = [...out];
  if (chars.length > max) out = chars.slice(0, max).join('');
  return out;
}

function normalizeRating(rating) {
  const n = Number(rating);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export function buildInsightsPayload({
  history,
  kidId,
  cadence = 'week',
  now = new Date(),
  lang = 'en',
  platform = 'web',
  appVersion = '0.1.0',
  rating = null,
  freeText = '',
  kids = [],
  includeSituations = true,
  includeMoves = true,
  includeRating = true,
  includeFreeText = true,
} = {}) {
  const aggregate = aggregateDigest(history, { kidId, cadence, now });
  const language = normalizeLang(lang);
  const payload = {
    schema_v: 1,
    taxonomy_v: 1,
    period: aggregate.period,
    period_key: aggregate.periodKey,
    lang: language,
    platform: normalizePlatform(platform),
    app_version: minorVersion(appVersion),
    situations: includeSituations ? situationRows(aggregate.situations) : [],
  };
  if (includeMoves) {
    const rows = moveRows(aggregate.moves);
    if (rows.length) payload.moves = rows;
  }
  const safeRating = includeRating ? normalizeRating(rating) : null;
  if (safeRating) payload.rating = safeRating;
  let scrubbed = '';
  if (includeFreeText) {
    scrubbed = scrubPII(freeText, kids, { lang: language });
    if (scrubbed) {
      payload.free_text = scrubbed;
      payload.free_text_scrubbed = true;
    }
  }
  return { payload, aggregate, scrubbed };
}

export function sentKey(kidId, periodKey) {
  return `${kidId}|${periodKey}`;
}

export function hasSentPeriod(meta, kidId, periodKey) {
  return Array.isArray(meta?.sentPeriods) && meta.sentPeriods.includes(sentKey(kidId, periodKey));
}

export function noteDigestOpened(meta, kidId, windowKey) {
  const base = meta || {};
  const lastShownPeriod = base.lastShownPeriod && typeof base.lastShownPeriod === 'object' ? base.lastShownPeriod : {};
  if (lastShownPeriod[kidId] === windowKey) return { meta: base, openedNew: false };
  return {
    openedNew: true,
    meta: {
      ...base,
      lastShownPeriod: { ...lastShownPeriod, [kidId]: windowKey },
      sentPeriods: Array.isArray(base.sentPeriods) ? base.sentPeriods : [],
      digestsOpened: (base.digestsOpened || 0) + 1,
      sharePrompted: !!base.sharePrompted,
    },
  };
}

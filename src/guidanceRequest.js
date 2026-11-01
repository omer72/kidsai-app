// What a guidance request is allowed to carry. The prompt quotes at most five
// earlier moments, so the wire payload keeps a short recent window for the
// active child and nothing from anyone else.
import { INTAKE_QUESTIONS, INVOLVED, LOCATIONS, MOODS, URGENCY } from './constants.js';

export const GUIDANCE_HISTORY_CAP = 8;

const STORY_CAP = 280;
const GIST_CAP = 200;
const HEADLINE_CAP = 120;
const NOTES_CAP = 800;
const INTAKE_CAP = 300;
const NAME_CAP = 80;
const TRY_ITEMS = 3;
const FEEDBACK = new Set(['worse', 'same', 'better', 'great']);

function clip(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function slimId(value) {
  return String(value ?? '').replace(/[^\w-]/g, '').slice(0, 80);
}

function knownId(list, id) {
  const s = String(id ?? '');
  return list.some((x) => x.id === s) ? s : '';
}

function slimBirthdate(value) {
  const s = String(value ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function slimAge(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 30) return undefined;
  return Math.floor(n);
}

function slimLanguage(language) {
  const code = String(language || 'en').split('-')[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);
  return code || 'en';
}

function slimIntake(intake) {
  if (!intake || typeof intake !== 'object') return undefined;
  const text = {};
  const answers = {};
  const other = {};
  for (const q of INTAKE_QUESTIONS) {
    if (q.text) {
      const v = clip(intake.text?.[q.id], INTAKE_CAP);
      if (v) text[q.id] = v;
      continue;
    }
    const allowed = new Set((q.options || []).map((o) => o.id));
    const picked = Array.isArray(intake.answers?.[q.id])
      ? intake.answers[q.id].filter((id) => allowed.has(id)).slice(0, q.max || 8)
      : [];
    if (picked.length) answers[q.id] = picked;
    const otherOpt = (q.options || []).find((o) => o.other);
    if (otherOpt && picked.includes(otherOpt.id)) {
      const extra = clip(intake.other?.[q.id], INTAKE_CAP);
      if (extra) other[q.id] = extra;
    }
  }
  if (!Object.keys(text).length && !Object.keys(answers).length) return undefined;
  const out = {};
  if (Object.keys(answers).length) out.answers = answers;
  if (Object.keys(text).length) out.text = text;
  if (Object.keys(other).length) out.other = other;
  return out;
}

function slimKid(kid) {
  if (!kid || typeof kid !== 'object') return null;
  const id = slimId(kid.id);
  if (!id) return null;
  const out = { id, name: clip(kid.name, NAME_CAP) };
  const birthdate = slimBirthdate(kid.birthdate);
  if (birthdate) out.birthdate = birthdate;
  const age = slimAge(kid.age);
  if (age !== undefined) out.age = age;
  if (kid.gender === 'boy' || kid.gender === 'girl') out.gender = kid.gender;
  if (kid.newSibling) out.newSibling = true;
  const notes = clip(kid.notes, NOTES_CAP);
  if (notes) out.notes = notes;
  const intake = slimIntake(kid.intake);
  if (intake) out.intake = intake;
  return out;
}

function slimResponse(response) {
  if (!response || typeof response !== 'object') return undefined;
  const summary = clip(response.summary, GIST_CAP);
  const title = clip(response.title, GIST_CAP);
  const trySection = Array.isArray(response.sections)
    ? response.sections.find((s) => s?.kind === 'try')
    : null;
  const heads = (trySection?.items || [])
    .map((it) => clip(it?.h, HEADLINE_CAP))
    .filter(Boolean)
    .slice(0, TRY_ITEMS);
  if (!summary && !title && !heads.length) return undefined;
  const out = {};
  if (summary) out.summary = summary;
  if (title) out.title = title;
  if (heads.length) out.sections = [{ kind: 'try', items: heads.map((h) => ({ h })) }];
  return out;
}

function slimMoment(entry, kidId) {
  const out = {
    id: Number(entry.id) || 0,
    kidId,
    story: clip(entry.story, STORY_CAP),
    feedback: FEEDBACK.has(entry.feedback) ? entry.feedback : null,
  };
  const when = clip(entry.when, 80);
  if (when) out.when = when;
  const where = knownId(LOCATIONS, entry.where);
  if (where) out.where = where;
  const mood = knownId(MOODS, entry.mood);
  if (mood) out.mood = mood;
  const response = slimResponse(entry.response);
  if (response) out.response = response;
  return out;
}

export function recentGuidanceHistory(history, kidId) {
  if (!kidId || !Array.isArray(history)) return [];
  return history
    .filter((h) => h && slimId(h.kidId) === kidId)
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
    .slice(0, GUIDANCE_HISTORY_CAP)
    .map((h) => slimMoment(h, kidId));
}

// `siblings` and any other children's records are ignored on purpose, even
// when an older client still posts them.
export function buildGuidanceRequest({ story, ctx, kid, history, language } = {}) {
  const scopedKid = slimKid(kid);
  const ctxOut = {};
  const location = knownId(LOCATIONS, ctx?.location);
  const mood = knownId(MOODS, ctx?.mood);
  const involved = knownId(INVOLVED, ctx?.involved);
  const urgency = knownId(URGENCY, ctx?.urgency);
  if (location) ctxOut.location = location;
  if (mood) ctxOut.mood = mood;
  if (involved) ctxOut.involved = involved;
  if (urgency) ctxOut.urgency = urgency;
  return {
    story: typeof story === 'string' ? story.trim() : '',
    ctx: ctxOut,
    kid: scopedKid,
    history: recentGuidanceHistory(history, scopedKid?.id),
    language: slimLanguage(language),
  };
}

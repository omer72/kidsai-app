import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  SAFETY_REFERRAL_RULES,
  buildSystemPrompt,
  guidancePromptFromBody,
} from '../netlify/functions/guidance.js';

const LANGS = ['he', 'en', 'es', undefined];

test('system prompt carries the safety/referral rules in every language mode', () => {
  for (const lang of LANGS) {
    const prompt = buildSystemPrompt(lang);
    assert.ok(prompt.includes(SAFETY_REFERRAL_RULES), String(lang));
    // Rules sit before the language directive and the OUTPUT line.
    assert.ok(prompt.indexOf('SAFETY AND PROFESSIONAL REFERRAL') < prompt.indexOf('LANGUAGE:'), String(lang));
    assert.ok(prompt.trimEnd().endsWith('OUTPUT: A single JSON object matching the schema. No prose outside JSON.'), String(lang));
  }
});

test('safety rules: emergency first, referral for concerns, none for routine', () => {
  const r = SAFETY_REFERRAL_RULES;
  assert.match(r, /contact local emergency services right now, before anything else/);
  assert.match(r, /FIRST sentence, at the start of "summary"/);
  assert.match(r, /self-harm/);
  assert.match(r, /abuse/);
  assert.match(r, /medical emergency/);
  assert.match(r, /pediatrician or an appropriate qualified professional/);
  assert.match(r, /safety, physical health, development, or mental health/);
  assert.match(r, /Never diagnose/);
  assert.match(r, /never prescribe/);
  assert.match(r, /never claim or imply that you can detect every risk/);
  assert.match(r, /Do not write or invent any phone number/);
  assert.match(r, /ORDINARY MOMENTS/);
  assert.match(r, /Do NOT add emergency instructions, professional-referral sentences, or medical disclaimers/);
  assert.match(r, /Do not add new keys or change the schema/);
  // No phone numbers baked into the prompt.
  assert.doesNotMatch(r, /\b\d{3}\b/);
});

test('response schema in the user prompt is unchanged', () => {
  const prompt = guidancePromptFromBody({
    story: 'She refused to brush her teeth',
    kid: { id: 'k', name: 'Kid', age: 4 },
    ctx: {},
    history: [],
    language: 'en',
  });
  const start = prompt.indexOf('Schema (use this exact shape, all keys present):');
  assert.ok(start > -1);
  const schemaText = prompt.slice(prompt.indexOf('{', start), prompt.indexOf('\n}', start) + 2);
  // Shape check: the example parses as JSON-like keys we expect.
  for (const key of ['"situation"', '"title"', '"summary"', '"sections"']) {
    assert.ok(schemaText.includes(key), key);
  }
  const kinds = [...schemaText.matchAll(/"kind": "(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(kinds, ['what', 'why', 'try', 'tonight']);
  assert.equal((schemaText.match(/"move":/g) || []).length, 3);
  assert.doesNotMatch(schemaText, /emergency|urgent|referral|safety/i);
});

test('manual QA fixture has 2 routine / 2 concern / 2 danger per language', () => {
  const fx = JSON.parse(readFileSync(new URL('./fixtures/safety-referral-scenarios.json', import.meta.url), 'utf8'));
  assert.match(fx._note, /NOT executed against the model/);
  for (const lang of ['he', 'en']) {
    for (const kind of ['routine', 'concern', 'danger']) {
      const n = fx.scenarios.filter((s) => s.language === lang && s.expect === kind).length;
      assert.equal(n, 2, `${lang}/${kind}`);
    }
  }
  for (const s of fx.scenarios) {
    assert.ok(guidancePromptFromBody({ story: s.story, kid: s.kid, ctx: {}, history: [], language: s.language }).includes(s.story), s.id);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReviewPrompt, normalizeReviewState, COOLDOWN_DAYS } from '../src/reviewPrompt.js';

const DAY = 86400000;
const T0 = 1_800_000_000_000;

test('first positive does not ask, second does', () => {
  let r = evaluateReviewPrompt({}, 'better', { now: T0 });
  assert.equal(r.shouldAsk, false); assert.equal(r.next.reviewUses, 1);
  r = evaluateReviewPrompt(r.next, 'great', { now: T0 });
  assert.equal(r.shouldAsk, true); assert.equal(r.next.reviewPromptCount, 1);
  assert.equal(r.next.reviewLastPromptAt, T0);
});

test('same / worse / null never ask and never count or reset', () => {
  for (const rating of ['same', 'worse', null, undefined, 'x']) {
    const r = evaluateReviewPrompt({ reviewUses: 5 }, rating, { now: T0 });
    assert.equal(r.shouldAsk, false); assert.equal(r.next.reviewUses, 5);
  }
});

test('web / non-native never asks but still counts', () => {
  const r = evaluateReviewPrompt({ reviewUses: 4 }, 'better', { now: T0, native: false });
  assert.equal(r.shouldAsk, false); assert.equal(r.next.reviewUses, 5); assert.equal(r.next.reviewPromptCount, 0);
});

test('60-day cooldown', () => {
  const s = { reviewUses: 3, reviewPromptCount: 1, reviewLastPromptAt: T0 };
  assert.equal(evaluateReviewPrompt(s, 'better', { now: T0 + (COOLDOWN_DAYS - 1) * DAY }).shouldAsk, false);
  assert.equal(evaluateReviewPrompt(s, 'better', { now: T0 + COOLDOWN_DAYS * DAY }).shouldAsk, true);
});

test('stops after 3 prompts', () => {
  const s = { reviewUses: 10, reviewPromptCount: 3, reviewLastPromptAt: T0 };
  assert.equal(evaluateReviewPrompt(s, 'great', { now: T0 + 400 * DAY }).shouldAsk, false);
});

test('migrates legacy askedForReview as one prompt, cooldown from now', () => {
  const n = normalizeReviewState({ askedForReview: true, reviewUses: 3 }, T0);
  assert.deepEqual(n, { reviewUses: 3, reviewPromptCount: 1, reviewLastPromptAt: T0 });
  assert.equal(evaluateReviewPrompt(n, 'better', { now: T0 + DAY }).shouldAsk, false);
});

test('garbage state is sanitized', () => {
  assert.deepEqual(normalizeReviewState({ reviewUses: -2, reviewPromptCount: 'a', reviewLastPromptAt: NaN }, T0),
    { reviewUses: 0, reviewPromptCount: 0, reviewLastPromptAt: 0 });
});

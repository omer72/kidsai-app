// Pure rules for the native store-review prompt. No DOM, no plugin import,
// so it can be unit tested with node --test.
//
// Asked only right after a Helped / Really helped close. Rules:
//  - at least MIN_POSITIVE positive marks in total (didn't-help never counts
//    and never resets the total);
//  - at most once per COOLDOWN_DAYS;
//  - never more than MAX_PROMPTS times per install.
// The OS throttles further (iOS: ~3 per 365 days; Play: quota).

export const MIN_POSITIVE = 2;
export const COOLDOWN_DAYS = 60;
export const MAX_PROMPTS = 3;
export const PROMPT_DELAY_MS = 1500;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isPositiveRating = (rating) => rating === 'better' || rating === 'great';

// Normalizes stored state, migrating the old one-shot `askedForReview` flag:
// someone already asked counts as one prompt, with the cooldown starting now.
export function normalizeReviewState(s = {}, now = Date.now()) {
  const positives = Number.isFinite(s.reviewUses) && s.reviewUses > 0 ? Math.floor(s.reviewUses) : 0;
  let count = Number.isFinite(s.reviewPromptCount) && s.reviewPromptCount > 0 ? Math.floor(s.reviewPromptCount) : 0;
  let lastAt = Number.isFinite(s.reviewLastPromptAt) && s.reviewLastPromptAt > 0 ? s.reviewLastPromptAt : 0;
  if (s.askedForReview === true && count === 0) { count = 1; lastAt = lastAt || now; }
  return { reviewUses: positives, reviewPromptCount: count, reviewLastPromptAt: lastAt };
}

// Returns { next, shouldAsk }. `next` is the review state to persist.
export function evaluateReviewPrompt(state, rating, { now = Date.now(), native = true } = {}) {
  const cur = normalizeReviewState(state, now);
  if (!isPositiveRating(rating)) return { next: cur, shouldAsk: false };
  const next = { ...cur, reviewUses: cur.reviewUses + 1 };
  const cooledDown = !next.reviewLastPromptAt || now - next.reviewLastPromptAt >= COOLDOWN_DAYS * DAY_MS;
  const shouldAsk = native
    && next.reviewUses >= MIN_POSITIVE
    && next.reviewPromptCount < MAX_PROMPTS
    && cooledDown;
  if (shouldAsk) {
    next.reviewPromptCount += 1;
    next.reviewLastPromptAt = now;
  }
  return { next, shouldAsk };
}

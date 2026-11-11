// RevenueCat entitlement gate for the Netlify functions, plus a small free
// allowance so a new parent sees real answers before any paywall.
//
// - Subscribers (entitlement active, trial included) are always allowed.
// - Everyone else gets FREE_MOMENTS answers (default 3, 0 turns it off). The
//   count lives on the RevenueCat subscriber as the `free_moments_used`
//   attribute, so there is no extra storage. Only a successful answer counts.
// - Log-only until AUTH_ENFORCE=true, so app versions that don't send
//   X-RC-User keep working while an update rolls out. Requires RC_SECRET_KEY
//   (RevenueCat secret API key); without it the check is skipped entirely.

const ENTITLEMENT_ID = process.env.RC_ENTITLEMENT_ID || 'premium';
const POSITIVE_TTL = 60 * 60 * 1000;
const RC_BASE = 'https://api.revenuecat.com/v1/subscribers';

export const FREE_ATTRIBUTE = 'free_moments_used';
export const DEFAULT_FREE_MOMENTS = 3;
export const FREE_REMAINING_HEADER = 'X-Free-Remaining';

// ponytail: in-memory caches, empty on cold start. `entitledUntil` only saves
// RevenueCat calls. `usedFloor` covers the gap between writing the attribute
// and RevenueCat returning it on the next read.
const entitledUntil = new Map();
const usedFloor = new Map();

export function resetEntitlementCache() {
  entitledUntil.clear();
  usedFloor.clear();
}

export function freeLimit(env = process.env) {
  const raw = String(env.FREE_MOMENTS ?? '').trim();
  if (!raw) return DEFAULT_FREE_MOMENTS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FREE_MOMENTS;
}

function isEnforced(env = process.env) {
  return /^(1|true)$/i.test(env.AUTH_ENFORCE || '');
}

function parseUsed(subscriber) {
  const n = Number.parseInt(subscriber?.subscriber_attributes?.[FREE_ATTRIBUTE]?.value ?? '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function readSubscriber(uid, secret, fetchImpl) {
  const until = entitledUntil.get(uid);
  if (until && Date.now() < until) return { entitled: true, used: 0 };
  const r = await fetchImpl(`${RC_BASE}/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!r.ok) throw new Error(`RevenueCat responded ${r.status}`);
  const { subscriber } = await r.json();
  const ent = subscriber?.entitlements?.[ENTITLEMENT_ID];
  const entitled = !!ent && (!ent.expires_date || new Date(ent.expires_date).getTime() > Date.now());
  if (entitled) {
    entitledUntil.set(uid, Date.now() + POSITIVE_TTL);
    return { entitled: true, used: 0 };
  }
  entitledUntil.delete(uid);
  const used = Math.max(parseUsed(subscriber), usedFloor.get(uid) || 0);
  return { entitled: false, used };
}

function denial(cors, code, limit) {
  return new Response(JSON.stringify({ error: 'subscription required', code, free_limit: limit }), {
    status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Decides whether this request may proceed.
// Returns { denied, grant }:
//   denied — a 403 Response to send back, or null to proceed.
//   grant  — null when nothing is known about the caller (no secret, no id,
//            RevenueCat unreachable); otherwise { uid, entitled, used, limit,
//            enforce }. Pass it to recordFreeUse() after a successful answer.
export async function checkAccess(req, cors, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const secret = env.RC_SECRET_KEY;
  if (!secret) {
    console.log('[auth] RC_SECRET_KEY not set — skipping entitlement check');
    return { denied: null, grant: null };
  }
  const enforce = isEnforced(env);
  const limit = freeLimit(env);
  const deny = (reason, code) => {
    console.log(`[auth] ${enforce ? 'DENY' : 'log-only'}: ${reason}`);
    return enforce ? denial(cors, code, limit) : null;
  };
  const uid = req.headers.get('x-rc-user');
  if (!uid) return { denied: deny('missing X-RC-User header', 'not_entitled'), grant: null };
  let sub;
  try {
    sub = await readSubscriber(uid, secret, fetchImpl);
  } catch (err) {
    // ponytail: fail open when RevenueCat is unreachable — availability over strictness
    console.log(`[auth] entitlement check failed (${err?.message}) — allowing`);
    return { denied: null, grant: null };
  }
  const grant = { uid, entitled: sub.entitled, used: sub.used, limit, enforce };
  if (sub.entitled || sub.used < limit) return { denied: null, grant };
  return { denied: deny(`free allowance used (${sub.used}/${limit}): ${uid}`, 'free_limit'), grant };
}

// Free answers left for this caller, or null when it should not be shown
// (subscriber, unknown caller, or the gate is still log-only).
export function freeRemaining(grant) {
  if (!grant || grant.entitled || !grant.enforce) return null;
  return Math.max(0, grant.limit - grant.used);
}

// Counts one free answer. Call only after the answer was produced. Returns the
// grant with the new count. A failed write is logged and swallowed: the parent
// already has the answer, and the in-memory floor still holds for this instance.
export async function recordFreeUse(grant, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!grant || grant.entitled) return grant;
  const secret = env.RC_SECRET_KEY;
  if (!secret) return grant;
  const used = grant.used + 1;
  usedFloor.set(grant.uid, used);
  try {
    const r = await fetchImpl(`${RC_BASE}/${encodeURIComponent(grant.uid)}/attributes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attributes: { [FREE_ATTRIBUTE]: { value: String(used), updated_at_ms: Date.now() } },
      }),
    });
    if (!r.ok) console.log(`[auth] free-use write failed: RevenueCat responded ${r.status}`);
  } catch (err) {
    console.log(`[auth] free-use write failed: ${err?.message}`);
  }
  return { ...grant, used };
}

// Kept for callers that only need the gate (transcription).
export async function requireEntitlement(req, cors, options) {
  return (await checkAccess(req, cors, options)).denied;
}

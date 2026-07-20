// RevenueCat entitlement gate for the Netlify functions. Log-only until
// AUTH_ENFORCE=true, so app versions that don't send X-RC-User keep working
// while the update rolls out. Requires RC_SECRET_KEY (RevenueCat secret API
// key); without it the check is skipped entirely.

const ENTITLEMENT_ID = process.env.RC_ENTITLEMENT_ID || 'premium';
const POSITIVE_TTL = 60 * 60 * 1000;
const NEGATIVE_TTL = 5 * 60 * 1000; // short, so a fresh subscriber isn't locked out for an hour

// ponytail: in-memory cache, empties on cold start — it only exists to save RevenueCat calls
const cache = new Map();

async function isEntitled(uid, secret) {
  const hit = cache.get(uid);
  if (hit && Date.now() < hit.until) return hit.entitled;
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!r.ok) throw new Error(`RevenueCat responded ${r.status}`);
  const { subscriber } = await r.json();
  const ent = subscriber?.entitlements?.[ENTITLEMENT_ID];
  const entitled = !!ent && (!ent.expires_date || new Date(ent.expires_date).getTime() > Date.now());
  cache.set(uid, { entitled, until: Date.now() + (entitled ? POSITIVE_TTL : NEGATIVE_TTL) });
  return entitled;
}

// Returns a 403 Response to send back, or null to proceed with the request.
export async function requireEntitlement(req, cors) {
  const secret = process.env.RC_SECRET_KEY;
  if (!secret) {
    console.log('[auth] RC_SECRET_KEY not set — skipping entitlement check');
    return null;
  }
  const enforce = /^(1|true)$/i.test(process.env.AUTH_ENFORCE || '');
  const deny = (reason) => {
    console.log(`[auth] ${enforce ? 'DENY' : 'log-only'}: ${reason}`);
    if (!enforce) return null;
    return new Response(JSON.stringify({ error: 'subscription required' }), {
      status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  };
  const uid = req.headers.get('x-rc-user');
  if (!uid) return deny('missing X-RC-User header');
  try {
    if (!(await isEntitled(uid, secret))) return deny(`not entitled: ${uid}`);
  } catch (err) {
    // ponytail: fail open when RevenueCat is unreachable — availability over strictness
    console.log(`[auth] entitlement check failed (${err?.message}) — allowing`);
  }
  return null;
}

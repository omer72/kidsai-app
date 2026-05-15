import { useEffect, useMemo, useState } from 'react';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { billingAvailable, getOfferings, priceString, purchasePackage, restorePurchases } from '../billing';

export function TrialReminderBanner({ daysLeft, kids, history, onUpgrade, onDismiss }) {
  const stats = useMemo(() => {
    const count = history.length;
    const kid = kids[0]?.name;
    if (count === 0) return null;
    if (kid) return `You've logged ${count} moment${count === 1 ? '' : 's'}. ${kid}'s patterns are starting to come into focus — keep going.`;
    return `You've logged ${count} moment${count === 1 ? '' : 's'}. Patterns are starting to come into focus — keep going.`;
  }, [history.length, kids]);
  return (
    <div style={{
      background: '#FFF', borderRadius: 18, padding: 16,
      border: `1px solid ${tokens.line}`, marginBottom: 14,
      position: 'relative',
    }}>
      <button onClick={onDismiss} style={{
        position: 'absolute', top: 12, right: 12,
        width: 24, height: 24, borderRadius: 24, border: 'none',
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.Close s={12} c={tokens.ink3}/>
      </button>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12, flexShrink: 0,
          background: tokens.primarySoft, color: tokens.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Clock s={18} c={tokens.primary}/>
        </div>
        <div style={{ flex: 1, paddingRight: 18 }}>
          <div style={{ fontFamily: tokens.sans, fontSize: 14, fontWeight: 600, color: tokens.ink, marginBottom: 4 }}>
            {daysLeft <= 0 ? 'Trial ends today' : daysLeft === 1 ? 'Trial ends tomorrow' : `${daysLeft} days left in your trial`}
          </div>
          {stats && (
            <div style={{ fontFamily: tokens.sans, fontSize: 13, lineHeight: 1.45, color: tokens.ink2, marginBottom: 10 }}>
              {stats}
            </div>
          )}
          <button onClick={onUpgrade} style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: tokens.sans, fontSize: 13, fontWeight: 600, color: tokens.primary,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>Continue with Kidsit AI <Icon.ArrowRight s={13} c={tokens.primary}/></button>
        </div>
      </div>
    </div>
  );
}

export function LapsedScreen({ history, kids, fullscreen, onPurchased }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [packages, setPackages] = useState({ monthly: null, yearly: null });
  const [plan, setPlan] = useState('yearly');

  useEffect(() => {
    if (!billingAvailable()) return;
    let mounted = true;
    getOfferings()
      .then((pkgs) => { if (mounted) setPackages(pkgs); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const yearlyPrice = priceString(packages.yearly) || '$59.99';
  const monthlyPrice = priceString(packages.monthly) || '$9.99';
  const targetPkg = plan === 'yearly' ? packages.yearly : packages.monthly;

  const handlePurchase = async (which) => {
    setError('');
    setPlan(which);
    const pkg = which === 'yearly' ? packages.yearly : packages.monthly;
    if (!billingAvailable()) { setError('Purchases unavailable in browser preview.'); return; }
    if (!pkg) { setError('Subscription products are still loading. Try again in a moment.'); return; }
    setBusy(true);
    try {
      const next = await purchasePackage(pkg);
      if (next.entitled) onPurchased?.(next);
      else setError('Purchase did not complete.');
    } catch (err) {
      if (err?.userCancelled) return;
      setError(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setError('');
    if (!billingAvailable()) { setError('Purchases unavailable in browser preview.'); return; }
    setBusy(true);
    try {
      const next = await restorePurchases();
      if (next.entitled) onPurchased?.(next);
      else setError('No active subscription found on this Apple ID.');
    } catch (err) {
      setError(err?.message || 'Restore failed.');
    } finally { setBusy(false); }
  };

  const momentsCount = history.length;
  const kidsCount = kids.length;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: tokens.bg }}>
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: fullscreen ? 'max(60px, env(safe-area-inset-top)) 24px max(40px, env(safe-area-inset-bottom))' : '60px 24px 40px',
        alignItems: 'center', justifyContent: 'center', overflowY: 'auto',
      }}>
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 28, opacity: 0.5 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 120,
            background: '#D1D5DD',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.Mic s={44} c="#FFF"/>
          </div>
        </div>

        <div style={{
          fontFamily: tokens.serif, fontSize: 26, lineHeight: 1.2, color: tokens.ink,
          letterSpacing: -0.4, fontWeight: 500, textAlign: 'center', marginBottom: 12,
          maxWidth: 300,
        }}>
          Your trial ended.
        </div>
        <div style={{
          fontFamily: tokens.sans, fontSize: 15, lineHeight: 1.5, color: tokens.ink2,
          textAlign: 'center', maxWidth: 320, marginBottom: 26,
        }}>
          Your moments and patterns are safe — they're waiting for you to come back.
        </div>

        {momentsCount > 0 && (
          <div style={{
            background: '#FFF', borderRadius: 18, padding: '14px 16px', marginBottom: 24,
            border: `1px solid ${tokens.line}`, width: '100%', maxWidth: 340,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 38, flexShrink: 0,
              background: tokens.primarySoft, color: tokens.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Sparkle s={18} c={tokens.primary}/>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontFamily: tokens.sans, fontSize: 13, fontWeight: 600, color: tokens.ink, marginBottom: 2 }}>
                {momentsCount} moment{momentsCount === 1 ? '' : 's'}{kidsCount > 0 ? ` · ${kidsCount} kid${kidsCount === 1 ? '' : 's'}` : ''}
              </div>
              <div style={{ fontFamily: tokens.sans, fontSize: 12, color: tokens.ink3 }}>
                Your history is paused, not deleted.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            marginBottom: 12, padding: '10px 12px', borderRadius: 12,
            background: `${tokens.danger}14`, border: `1px solid ${tokens.danger}40`,
            fontFamily: tokens.sans, fontSize: 13, color: tokens.danger, lineHeight: 1.4,
            maxWidth: 340, width: '100%',
          }}>{error}</div>
        )}

        <button onClick={() => handlePurchase('yearly')} disabled={busy} style={{
          width: '100%', maxWidth: 340, padding: '17px 20px', borderRadius: 16,
          border: 'none', background: busy ? tokens.surfaceAlt : tokens.ink,
          color: busy ? tokens.ink3 : '#fff', cursor: busy ? 'not-allowed' : 'pointer',
          fontFamily: tokens.sans, fontSize: 16, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: busy ? 'none' : `0 14px 28px ${tokens.ink}30`,
          marginBottom: 10,
        }}>
          {busy && plan === 'yearly' ? 'Working…' : `Resume Kidsit AI · ${yearlyPrice}/year`}
        </button>
        <button onClick={() => handlePurchase('monthly')} disabled={busy} style={{
          background: 'transparent', border: 'none', padding: '8px 0',
          fontFamily: tokens.sans, fontSize: 13, color: tokens.ink3, fontWeight: 500,
          cursor: busy ? 'not-allowed' : 'pointer',
        }}>
          Pay monthly instead · {monthlyPrice}/mo
        </button>
        <button onClick={handleRestore} disabled={busy} style={{
          background: 'transparent', border: 'none', padding: '4px 0',
          fontFamily: tokens.sans, fontSize: 12, color: tokens.ink3,
          cursor: busy ? 'not-allowed' : 'pointer', textDecoration: 'underline',
        }}>
          Restore purchase
        </button>
      </div>
    </div>
  );
}

export function SubscriptionScreen({ billing, onBack, onChanged, fullscreen }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const productId = billing?.productId || '';
  const isYearly = /year/i.test(productId);
  const expiresAt = billing?.expiresAt;
  const renews = expiresAt ? new Date(expiresAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const willRenew = !!billing?.willRenew;

  const handleRestore = async () => {
    setError('');
    setBusy(true);
    try {
      const next = await restorePurchases();
      onChanged?.(next);
    } catch (err) {
      setError(err?.message || 'Restore failed.');
    } finally { setBusy(false); }
  };

  const manageInApple = () => {
    if (window?.Capacitor?.isNativePlatform?.()) {
      window.location.href = 'itms-apps://apps.apple.com/account/subscriptions';
    } else {
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', background: tokens.bg, paddingBottom: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 4px 18px',
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 36, border: 'none',
          background: '#FFF', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(11,29,58,0.06)',
        }}>
          <Icon.Back s={16} c={tokens.ink}/>
        </button>
        <div style={{ fontFamily: tokens.serif, fontSize: 22, fontWeight: 500, color: tokens.ink, letterSpacing: -0.3 }}>
          Subscription
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{
          background: `linear-gradient(160deg, ${tokens.primary} 0%, ${tokens.primaryInk} 100%)`,
          borderRadius: 22, padding: 22, marginBottom: 16, color: '#FFF',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 160,
            background: 'rgba(255,255,255,0.08)',
          }}/>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: 999,
            fontFamily: tokens.sans, fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
            marginBottom: 14,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 6, background: '#A7F3C9' }}/>
            ACTIVE
          </div>
          <div style={{ fontFamily: tokens.serif, fontSize: 26, fontWeight: 500, letterSpacing: -0.4, marginBottom: 4 }}>
            Kidsit AI {isYearly ? 'Yearly' : 'Monthly'}
          </div>
          <div style={{ fontFamily: tokens.sans, fontSize: 14, opacity: 0.85, marginBottom: 18 }}>
            {isYearly ? '$59.99/year' : '$9.99/month'} · {willRenew ? `renews ${renews}` : `ends ${renews}`}
          </div>
          {billing?.inTrial && (
            <div style={{ fontFamily: tokens.sans, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
              You're currently in the introductory period.
            </div>
          )}
        </div>

        <div style={{
          background: '#FFF', borderRadius: 18, overflow: 'hidden',
          border: `1px solid ${tokens.line}`, marginBottom: 16,
        }}>
          {[
            { label: isYearly ? 'Switch to monthly' : 'Switch to yearly', detail: isYearly ? '$9.99/month' : 'Save 51% · $59.99/year', onClick: manageInApple },
            { label: 'Manage in Apple ID', detail: 'Cancel, pause, change plan', onClick: manageInApple },
            { label: 'Restore purchase', detail: 'For previously purchased subscriptions', onClick: handleRestore },
          ].map((row, i, arr) => (
            <button key={i} onClick={row.onClick} disabled={busy} style={{
              width: '100%', padding: '14px 16px', textAlign: 'left',
              background: 'transparent', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
              borderBottom: i < arr.length - 1 ? `1px solid ${tokens.line}` : 'none',
              display: 'flex', alignItems: 'center',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: tokens.sans, fontSize: 14.5, fontWeight: 500, color: tokens.ink, marginBottom: row.detail ? 2 : 0 }}>
                  {row.label}
                </div>
                {row.detail && (
                  <div style={{ fontFamily: tokens.sans, fontSize: 12, color: tokens.ink3 }}>{row.detail}</div>
                )}
              </div>
              <Icon.Chevron s={13} c={tokens.ink3}/>
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            marginBottom: 14, padding: '10px 12px', borderRadius: 12,
            background: `${tokens.danger}14`, border: `1px solid ${tokens.danger}40`,
            fontFamily: tokens.sans, fontSize: 13, color: tokens.danger, lineHeight: 1.4,
          }}>{error}</div>
        )}

        <button onClick={manageInApple} style={{
          width: '100%', padding: '14px 16px', borderRadius: 14,
          background: 'transparent', cursor: 'pointer',
          border: `1px solid ${tokens.line}`,
          fontFamily: tokens.sans, fontSize: 14, fontWeight: 500, color: tokens.danger,
        }}>
          Cancel subscription
        </button>
        <div style={{
          marginTop: 14, fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3,
          textAlign: 'center', lineHeight: 1.5, padding: '0 14px',
        }}>
          You'll keep access until your renewal date. Your moments stay private and saved.
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { IOSStatusBar } from './IOSFrame';
import { billingAvailable, getOfferings, introOfferPeriod, priceString, purchasePackage, restorePurchases } from '../billing';

export function PaywallScreen({ mode = 'upgrade', onStart, onClose, onTrialStart, fullscreen, onPurchased }) {
  const isTrialStart = mode === 'trialStart';
  const [plan, setPlan] = useState('yearly');
  const [packages, setPackages] = useState({ monthly: null, yearly: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isTrialStart) return;
    if (!billingAvailable()) return;
    let mounted = true;
    getOfferings()
      .then((pkgs) => { if (mounted) setPackages(pkgs); })
      .catch((err) => { if (mounted) setError(err?.message || 'Could not load offers.'); });
    return () => { mounted = false; };
  }, [isTrialStart]);

  const monthlyPkg = packages.monthly;
  const yearlyPkg = packages.yearly;
  const selectedPkg = plan === 'yearly' ? yearlyPkg : monthlyPkg;
  const yearlyPrice = priceString(yearlyPkg) || '$59.99';
  const monthlyPrice = priceString(monthlyPkg) || '$9.99';
  const trial = introOfferPeriod(yearlyPkg) || introOfferPeriod(monthlyPkg) || '7-day';

  const handlePurchase = async () => {
    setError('');
    if (!billingAvailable()) {
      onStart?.();
      return;
    }
    if (!selectedPkg) {
      setError('Subscription products are still loading. Try again in a moment.');
      return;
    }
    setBusy(true);
    try {
      const next = await purchasePackage(selectedPkg);
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
    if (!billingAvailable()) {
      setError('Purchases unavailable in browser preview.');
      return;
    }
    setBusy(true);
    try {
      const next = await restorePurchases();
      if (next.entitled) onPurchased?.(next);
      else setError('No active subscription found on this Apple ID.');
    } catch (err) {
      setError(err?.message || 'Restore failed.');
    } finally {
      setBusy(false);
    }
  };

  const yearlyHasTrial = !!introOfferPeriod(yearlyPkg);
  const monthlyHasTrial = !!introOfferPeriod(monthlyPkg);
  const ctaLabel = busy
    ? 'Working…'
    : (isTrialStart
        ? 'Start 7-day free trial'
        : (plan === 'yearly' && yearlyHasTrial) || (plan === 'monthly' && monthlyHasTrial)
          ? `Start 7-day free trial`
          : `Subscribe ${plan === 'yearly' ? yearlyPrice + '/yr' : monthlyPrice + '/mo'}`);

  const handleCTA = () => {
    if (isTrialStart) { onTrialStart?.(); return; }
    handlePurchase();
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: tokens.bg }}>
      {!fullscreen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <IOSStatusBar dark={false}/>
        </div>
      )}
      {onClose && (
        <button onClick={onClose} style={{
          position: 'absolute', top: fullscreen ? 'max(20px, env(safe-area-inset-top))' : 58,
          right: 18, zIndex: 20,
          width: 32, height: 32, borderRadius: 32, border: 'none',
          background: '#FFFFFFCC', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Close s={14} c={tokens.ink2}/>
        </button>
      )}

      <div style={{
        height: '100%', overflowY: 'auto', overflowX: 'hidden',
        padding: fullscreen ? 'max(60px, env(safe-area-inset-top)) 22px max(28px, env(safe-area-inset-bottom))' : '70px 22px 28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{
            width: 78, height: 78, borderRadius: 78, position: 'relative',
            background: `radial-gradient(circle at 35% 30%, #5A7EFF 0%, ${tokens.primary} 70%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 16px 36px ${tokens.primary}40`,
          }}>
            <Icon.Sparkle s={32} c="#fff"/>
          </div>
        </div>

        <div style={{
          fontFamily: tokens.serif, fontSize: 30, lineHeight: 1.1, color: tokens.ink,
          letterSpacing: -0.7, fontWeight: 500, textAlign: 'center', marginBottom: 10,
          padding: '0 8px',
        }}>
          The full Kidsit AI,<br/>
          <span style={{ fontStyle: 'italic', color: tokens.primary }}>at your fingertips.</span>
        </div>
        <div style={{
          fontFamily: tokens.sans, fontSize: 14, color: tokens.ink2, textAlign: 'center',
          maxWidth: 300, margin: '0 auto 24px', lineHeight: 1.5,
        }}>
          Cancel anytime. {trial} free trial. No surprise charges.
        </div>

        <div style={{
          background: '#FFF', borderRadius: 20, padding: '18px 18px 6px',
          border: `1px solid ${tokens.line}`, marginBottom: 18,
        }}>
          {[
            { t: 'Track every child', s: 'Add as many kids as you have. Each gets their own profile and patterns.' },
            { t: 'Unlimited moments', s: 'Record, log, learn — as often as parenting demands.' },
            { t: 'Pattern detection', s: 'Weekly notice of triggers and what’s actually working.' },
            { t: 'Co-parent sharing', s: 'Send any moment to your partner so you’re aligned.' },
            { t: 'Private. Always.', s: 'End-to-end encrypted. Never used to train models.' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '10px 0',
              borderBottom: i < 4 ? `1px solid ${tokens.line}` : 'none',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 24, flexShrink: 0,
                background: tokens.primarySoft, color: tokens.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
              }}>
                <Icon.Check s={13} c={tokens.primary}/>
              </div>
              <div>
                <div style={{ fontFamily: tokens.sans, fontSize: 14.5, fontWeight: 600, color: tokens.ink, marginBottom: 2 }}>{f.t}</div>
                <div style={{ fontFamily: tokens.sans, fontSize: 13, color: tokens.ink2, lineHeight: 1.45 }}>{f.s}</div>
              </div>
            </div>
          ))}
        </div>

        {!isTrialStart && (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setPlan('yearly')} style={{
            padding: '16px 18px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
            background: '#FFF', border: `2px solid ${plan === 'yearly' ? tokens.primary : tokens.line}`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -10, right: 16,
              background: tokens.primary, color: '#fff',
              fontFamily: tokens.sans, fontSize: 10, fontWeight: 700,
              padding: '4px 10px', borderRadius: 999, letterSpacing: 0.6,
            }}>BEST VALUE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 22, flexShrink: 0,
                border: `2px solid ${plan === 'yearly' ? tokens.primary : tokens.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: plan === 'yearly' ? tokens.primary : 'transparent',
              }}>
                {plan === 'yearly' && <Icon.Check s={11} c="#fff"/>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: tokens.sans, fontSize: 15, fontWeight: 600, color: tokens.ink }}>Yearly</div>
                <div style={{ fontFamily: tokens.sans, fontSize: 12, color: tokens.ink3, marginTop: 1 }}>Billed once a year</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: tokens.serif, fontSize: 22, fontWeight: 600, color: tokens.ink, letterSpacing: -0.3 }}>{yearlyPrice}</div>
                <div style={{ fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3 }}>per year</div>
              </div>
            </div>
          </button>

          <button onClick={() => setPlan('monthly')} style={{
            padding: '16px 18px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
            background: '#FFF', border: `2px solid ${plan === 'monthly' ? tokens.primary : tokens.line}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 22, flexShrink: 0,
                border: `2px solid ${plan === 'monthly' ? tokens.primary : tokens.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: plan === 'monthly' ? tokens.primary : 'transparent',
              }}>
                {plan === 'monthly' && <Icon.Check s={11} c="#fff"/>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: tokens.sans, fontSize: 15, fontWeight: 600, color: tokens.ink }}>Monthly</div>
                <div style={{ fontFamily: tokens.sans, fontSize: 12, color: tokens.ink3, marginTop: 1 }}>Pay as you go</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: tokens.serif, fontSize: 22, fontWeight: 600, color: tokens.ink, letterSpacing: -0.3 }}>{monthlyPrice}</div>
                <div style={{ fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3 }}>per month</div>
              </div>
            </div>
          </button>
        </div>
        </>)}

        {error && (
          <div style={{
            marginBottom: 12, padding: '10px 12px', borderRadius: 12,
            background: `${tokens.danger}14`, border: `1px solid ${tokens.danger}40`,
            fontFamily: tokens.sans, fontSize: 13, color: tokens.danger, lineHeight: 1.4,
          }}>{error}</div>
        )}

        <button onClick={handleCTA} disabled={busy} style={{
          width: '100%', padding: '17px 20px', borderRadius: 16, border: 'none',
          background: busy ? tokens.surfaceAlt : tokens.ink,
          color: busy ? tokens.ink3 : '#fff',
          cursor: busy ? 'not-allowed' : 'pointer',
          fontFamily: tokens.sans, fontSize: 16, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: busy ? 'none' : `0 14px 28px ${tokens.ink}30`,
        }}>
          {ctaLabel}
        </button>
        <div style={{
          textAlign: 'center', marginTop: 12,
          fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3, lineHeight: 1.6,
        }}>
          {isTrialStart
            ? 'Full access for 7 days. We won’t ask for payment until then.'
            : <>
                {plan === 'yearly' ? `${yearlyPrice}/year` : `${monthlyPrice}/month`}, auto-renewing. Cancel anytime at least 24 hours before the period ends via your Apple ID account settings. Any unused portion of a free trial is forfeited when you purchase a subscription.
              </>}
          <br/>
          {!isTrialStart && (
            <>
              <button onClick={handleRestore} disabled={busy} style={{
                background: 'transparent', border: 'none', padding: 0, cursor: busy ? 'not-allowed' : 'pointer',
                color: tokens.ink2, fontFamily: tokens.sans, fontSize: 11, textDecoration: 'underline',
              }}>Restore purchase</button>
              {' · '}
            </>
          )}
          <a href="https://kidsit.ai/terms" target="_blank" rel="noopener noreferrer"
             style={{ color: tokens.ink2, textDecoration: 'underline' }}>Terms</a>
          {' · '}
          <a href="https://kidsit.ai/privacy" target="_blank" rel="noopener noreferrer"
             style={{ color: tokens.ink2, textDecoration: 'underline' }}>Privacy</a>
          {onStart && !isTrialStart && (
            <>
              <br/>
              <button onClick={onStart} disabled={busy} style={{
                background: 'transparent', border: 'none', padding: '10px 0 0', cursor: busy ? 'not-allowed' : 'pointer',
                color: tokens.ink3, fontFamily: tokens.sans, fontSize: 12,
              }}>Maybe later — try with 1 kid free</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

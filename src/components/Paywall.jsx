import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { IOSStatusBar } from './IOSFrame';
import { billingAvailable, getOfferings, introOfferPeriod, onBillingUpdate, presentCodeRedemptionSheet, priceString, purchasePackage, restorePurchases } from '../billing';

const REDEEM_COOLDOWN_MS = 20000;

export function PaywallScreen({ mode = 'upgrade', onStart, onClose, onTrialStart, fullscreen, onPurchased }) {
  const { t } = useTranslation();
  const isTrialStart = mode === 'trialStart';
  const [plan, setPlan] = useState('yearly');
  const [packages, setPackages] = useState({ monthly: null, yearly: null });
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [redeemLockedUntil, setRedeemLockedUntil] = useState(0);
  const [, setNowTick] = useState(0);

  useEffect(() => {
    if (isTrialStart) { setPackagesLoaded(true); return; }
    if (!billingAvailable()) { setPackagesLoaded(true); return; }
    let mounted = true;
    getOfferings()
      .then((pkgs) => { if (mounted) { setPackages(pkgs); setPackagesLoaded(true); } })
      .catch((err) => { if (mounted) { setError(err?.message || 'Could not load offers.'); setPackagesLoaded(true); } });
    return () => { mounted = false; };
  }, [isTrialStart]);

  const monthlyPkg = packages.monthly;
  const yearlyPkg = packages.yearly;
  const selectedPkg = plan === 'yearly' ? yearlyPkg : monthlyPkg;
  const yearlyPrice = priceString(yearlyPkg) || '$59.99';
  const monthlyPrice = priceString(monthlyPkg) || '$9.99';
  const introPeriod = introOfferPeriod(yearlyPkg) || introOfferPeriod(monthlyPkg);
  const trial = introPeriod
    ? t(`paywall.trialPeriod.${introPeriod.unit}`, { count: introPeriod.n, defaultValue: t('paywall.trialDefault') })
    : t('paywall.trialDefault');

  const handlePurchase = async (which) => {
    setError('');
    const pkg = which === 'yearly' ? yearlyPkg : which === 'monthly' ? monthlyPkg : selectedPkg;
    if (which) setPlan(which);
    if (!billingAvailable()) {
      onStart?.();
      return;
    }
    if (!pkg) {
      setError(t('paywall.productsLoading'));
      return;
    }
    setBusy(true);
    try {
      const next = await purchasePackage(pkg);
      if (next.entitled) onPurchased?.(next);
      else setError(t('paywall.purchaseFailed'));
    } catch (err) {
      if (err?.userCancelled) return;
      setError(err?.message || t('paywall.genericError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRedeemCode = async () => {
    setError('');
    if (!billingAvailable()) {
      setError(t('paywall.promoCodeUnavailable'));
      return;
    }
    if (Date.now() < redeemLockedUntil) {
      setError(t('paywall.redeemInProgress'));
      return;
    }
    setRedeemLockedUntil(Date.now() + REDEEM_COOLDOWN_MS);
    try {
      await presentCodeRedemptionSheet();
    } catch (err) {
      setError(err?.message || t('paywall.genericError'));
    }
  };

  useEffect(() => {
    if (!billingAvailable()) return;
    return onBillingUpdate((next) => {
      if (next?.entitled) onPurchased?.(next);
    });
  }, [onPurchased]);

  useEffect(() => {
    if (redeemLockedUntil <= Date.now()) return;
    const id = setTimeout(() => setNowTick((n) => n + 1), redeemLockedUntil - Date.now());
    return () => clearTimeout(id);
  }, [redeemLockedUntil]);

  const redeemLocked = Date.now() < redeemLockedUntil;

  const handleRestore = async () => {
    setError('');
    if (!billingAvailable()) {
      setError(t('paywall.restoreUnavailable'));
      return;
    }
    setBusy(true);
    try {
      const next = await restorePurchases();
      if (next.entitled) onPurchased?.(next);
      else setError(t('paywall.noSubscriptionFound'));
    } catch (err) {
      setError(err?.message || t('paywall.restoreFailed'));
    } finally {
      setBusy(false);
    }
  };

  const yearlyHasTrial = !!introOfferPeriod(yearlyPkg);
  const monthlyHasTrial = !!introOfferPeriod(monthlyPkg);
  const ctaLabel = busy
    ? t('common.working')
    : (isTrialStart
        ? t('paywall.ctaTrialStart')
        : (plan === 'yearly' && yearlyHasTrial) || (plan === 'monthly' && monthlyHasTrial)
          ? t('paywall.ctaTrialStart')
          : (plan === 'yearly' ? t('paywall.ctaSubscribeYearly', { price: yearlyPrice }) : t('paywall.ctaSubscribeMonthly', { price: monthlyPrice })));

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
          insetInlineEnd: 18, zIndex: 20,
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
            background: `radial-gradient(circle at 35% 30%, ${tokens.primary} 0%, ${tokens.primaryInk} 80%)`,
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
          {t('paywall.headline1')}<br/>
          <span style={{ fontStyle: 'italic', color: tokens.primary }}>{t('paywall.headline2')}</span>
        </div>
        <div style={{
          fontFamily: tokens.sans, fontSize: 14, color: tokens.ink2, textAlign: 'center',
          maxWidth: 300, margin: '0 auto 24px', lineHeight: 1.5,
        }}>
          {t('paywall.subhead', { trial })}
        </div>

        <div style={{
          background: '#FFF', borderRadius: 20, padding: '18px 18px 6px',
          border: `1px solid ${tokens.line}`, marginBottom: 18,
        }}>
          {[
            { t: t('paywall.features.trackEveryChild.title'), s: t('paywall.features.trackEveryChild.body') },
            { t: t('paywall.features.unlimitedMoments.title'), s: t('paywall.features.unlimitedMoments.body') },
            { t: t('paywall.features.patternDetection.title'), s: t('paywall.features.patternDetection.body') },
            { t: t('paywall.features.coParentSharing.title'), s: t('paywall.features.coParentSharing.body') },
            { t: t('paywall.features.private.title'), s: t('paywall.features.private.body') },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {/* Yearly — direct purchase button. Tap = open Apple IAP sheet. */}
          <button
            onClick={() => handlePurchase('yearly')}
            disabled={busy || (billingAvailable() && (!packagesLoaded || !yearlyPkg))}
            style={{
              padding: '18px 18px 16px', borderRadius: 16,
              cursor: (busy || (billingAvailable() && (!packagesLoaded || !yearlyPkg))) ? 'progress' : 'pointer',
              textAlign: 'start',
              background: tokens.ink, border: 'none', color: '#fff', position: 'relative',
              boxShadow: (busy || (billingAvailable() && (!packagesLoaded || !yearlyPkg))) ? 'none' : `0 14px 28px ${tokens.ink}30`,
              opacity: (billingAvailable() && (!packagesLoaded || !yearlyPkg)) ? 0.6 : 1,
            }}>
            <div style={{
              position: 'absolute', top: -10, insetInlineEnd: 16,
              background: tokens.primary, color: '#fff',
              fontFamily: tokens.sans, fontSize: 10, fontWeight: 700,
              padding: '4px 10px', borderRadius: 999, letterSpacing: 0.6,
            }}>{t('paywall.bestValue')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: tokens.sans, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  {t('paywall.yearly')}
                </div>
                <div style={{ fontFamily: tokens.sans, fontSize: 13, opacity: 0.85, lineHeight: 1.35 }}>
                  {(billingAvailable() && !packagesLoaded)
                    ? t('common.working')
                    : t('paywall.trialThenYearly', { price: yearlyPrice })}
                </div>
              </div>
              <Icon.ArrowRight s={18} c="#fff"/>
            </div>
          </button>

          {/* Monthly — direct purchase button. */}
          <button
            onClick={() => handlePurchase('monthly')}
            disabled={busy || (billingAvailable() && (!packagesLoaded || !monthlyPkg))}
            style={{
              padding: '18px 18px 16px', borderRadius: 16,
              cursor: (busy || (billingAvailable() && (!packagesLoaded || !monthlyPkg))) ? 'progress' : 'pointer',
              textAlign: 'start',
              background: '#FFF', border: `2px solid ${tokens.line}`,
              opacity: (billingAvailable() && (!packagesLoaded || !monthlyPkg)) ? 0.6 : 1,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: tokens.sans, fontSize: 16, fontWeight: 700, color: tokens.ink, marginBottom: 4 }}>
                  {t('paywall.monthly')}
                </div>
                <div style={{ fontFamily: tokens.sans, fontSize: 13, color: tokens.ink2, lineHeight: 1.35 }}>
                  {!packagesLoaded
                    ? t('common.working')
                    : t('paywall.trialThenMonthly', { price: monthlyPrice })}
                </div>
              </div>
              <Icon.ArrowRight s={18} c={tokens.ink2}/>
            </div>
          </button>
        </div>

        <button onClick={handleRedeemCode} disabled={busy || redeemLocked} style={{
          width: '100%', marginBottom: 16, padding: '12px 14px', borderRadius: 12,
          background: tokens.primarySoft, border: `1px solid ${tokens.primary}33`,
          cursor: (busy || redeemLocked) ? 'not-allowed' : 'pointer',
          opacity: redeemLocked ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: tokens.primary, fontFamily: tokens.sans, fontSize: 14, fontWeight: 600,
        }}>
          <Icon.Sparkle s={14} c={tokens.primary}/>
          {redeemLocked ? t('paywall.redeemWaiting') : t('paywall.redeemCode')}
        </button>
        </>)}

        {error && (
          <div style={{
            marginBottom: 12, padding: '10px 12px', borderRadius: 12,
            background: `${tokens.danger}14`, border: `1px solid ${tokens.danger}40`,
            fontFamily: tokens.sans, fontSize: 13, color: tokens.danger, lineHeight: 1.4,
          }}>{error}</div>
        )}

        {isTrialStart && (
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
        )}
        {onStart && !isTrialStart && (
          <div style={{ textAlign: 'center', marginTop: 14, marginBottom: 4 }}>
            <button onClick={onStart} disabled={busy} style={{
              background: 'transparent', border: 'none',
              padding: '10px 16px', cursor: busy ? 'not-allowed' : 'pointer',
              color: tokens.ink2, fontFamily: tokens.sans, fontSize: 14, fontWeight: 500,
              textDecoration: 'underline', textUnderlineOffset: 4,
            }}>{t('paywall.maybeLater')}</button>
          </div>
        )}
        <div style={{
          textAlign: 'center', marginTop: 12,
          fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3, lineHeight: 1.6,
        }}>
          {isTrialStart
            ? t('paywall.trialStartFooter')
            : <>
                {t('paywall.autoRenewDisclosure', { price: `${yearlyPrice}/year ${t('common.or') || 'or'} ${monthlyPrice}/month` })}
              </>}
          <br/>
          {!isTrialStart && (
            <>
              <button onClick={handleRestore} disabled={busy} style={{
                background: 'transparent', border: 'none', padding: 0, cursor: busy ? 'not-allowed' : 'pointer',
                color: tokens.ink2, fontFamily: tokens.sans, fontSize: 11, textDecoration: 'underline',
              }}>{t('common.restorePurchase')}</button>
              {' · '}
            </>
          )}
          <a href="https://kidsit.ai/terms" target="_blank" rel="noopener noreferrer"
             style={{ color: tokens.ink2, textDecoration: 'underline' }}>{t('common.terms')}</a>
          {' · '}
          <a href="https://kidsit.ai/privacy" target="_blank" rel="noopener noreferrer"
             style={{ color: tokens.ink2, textDecoration: 'underline' }}>{t('common.privacy')}</a>
        </div>
      </div>
    </div>
  );
}

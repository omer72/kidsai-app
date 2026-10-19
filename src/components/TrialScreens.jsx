import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, fs } from '../theme';
import { Icon } from './Icons';
import { restorePurchases } from '../billing';
import { isAndroidPlatform } from '../platform';

export function SubscriptionScreen({ billing, onBack, onChanged, fullscreen }) {
  const { t } = useTranslation();
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
      setError(err?.message || t('paywall.restoreFailed'));
    } finally { setBusy(false); }
  };

  const isAndroid = isAndroidPlatform();
  const manageSubscription = () => {
    if (isAndroid) {
      const url = productId
        ? `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(productId)}&package=ai.kidsit.app`
        : 'https://play.google.com/store/account/subscriptions';
      window.open(url, '_blank');
    } else if (window?.Capacitor?.isNativePlatform?.()) {
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
        <div style={{ fontFamily: tokens.serif, fontSize: fs(22), fontWeight: 500, color: tokens.ink, letterSpacing: -0.3 }}>
          {t('subscription.title')}
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
            fontFamily: tokens.sans, fontSize: fs(10), fontWeight: 700, letterSpacing: 0.6,
            marginBottom: 14,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 6, background: '#A7F3C9' }}/>
            {t('subscription.active')}
          </div>
          <div style={{ fontFamily: tokens.serif, fontSize: fs(26), fontWeight: 500, letterSpacing: -0.4, marginBottom: 4 }}>
            {isYearly ? t('subscription.planYearly') : t('subscription.planMonthly')}
          </div>
          <div style={{ fontFamily: tokens.sans, fontSize: fs(14), opacity: 0.85, marginBottom: 18 }}>
            {(isYearly ? t('subscription.yearlyPriceLine') : t('subscription.monthlyPriceLine'))} · {willRenew ? t('subscription.renewsOn', { date: renews }) : t('subscription.endsOn', { date: renews })}
          </div>
          {billing?.inTrial && (
            <div style={{ fontFamily: tokens.sans, fontSize: fs(12), opacity: 0.75, lineHeight: 1.5 }}>
              {t('subscription.inTrial')}
            </div>
          )}
        </div>

        <div style={{
          background: '#FFF', borderRadius: 18, overflow: 'hidden',
          border: `1px solid ${tokens.line}`, marginBottom: 16,
        }}>
          {[
            { label: isYearly ? t('subscription.switchToMonthly') : t('subscription.switchToYearly'), detail: isYearly ? t('subscription.switchToMonthlyDetail') : t('subscription.switchToYearlyDetail'), onClick: manageSubscription },
            { label: isAndroid ? t('subscription.manageInGooglePlay') : t('subscription.manageInAppleId'), detail: t('subscription.manageDetail'), onClick: manageSubscription },
            { label: t('common.restorePurchase'), detail: t('subscription.restoreDetail'), onClick: handleRestore },
          ].map((row, i, arr) => (
            <button key={i} onClick={row.onClick} disabled={busy} style={{
              width: '100%', padding: '14px 16px', textAlign: 'start',
              background: 'transparent', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
              borderBottom: i < arr.length - 1 ? `1px solid ${tokens.line}` : 'none',
              display: 'flex', alignItems: 'center',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: tokens.sans, fontSize: fs(14.5), fontWeight: 500, color: tokens.ink, marginBottom: row.detail ? 2 : 0 }}>
                  {row.label}
                </div>
                {row.detail && (
                  <div style={{ fontFamily: tokens.sans, fontSize: fs(12), color: tokens.ink3 }}>{row.detail}</div>
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
            fontFamily: tokens.sans, fontSize: fs(13), color: tokens.danger, lineHeight: 1.4,
          }}>{error}</div>
        )}

        <button onClick={manageSubscription} style={{
          width: '100%', padding: '14px 16px', borderRadius: 14,
          background: 'transparent', cursor: 'pointer',
          border: `1px solid ${tokens.line}`,
          fontFamily: tokens.sans, fontSize: fs(14), fontWeight: 500, color: tokens.danger,
        }}>
          {t('subscription.cancel')}
        </button>
        <div style={{
          marginTop: 14, fontFamily: tokens.sans, fontSize: fs(11), color: tokens.ink3,
          textAlign: 'center', lineHeight: 1.5, padding: '0 14px',
        }}>
          {t('subscription.cancelFooter')}
        </div>
      </div>
    </div>
  );
}

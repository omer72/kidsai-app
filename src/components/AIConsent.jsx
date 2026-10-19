import { useTranslation } from 'react-i18next';
import { tokens, fs } from '../theme';
import { safeBottom, safeTop } from '../platform';
import { Icon } from './Icons';

export function AIConsentModal({ onAgree, onDecline, fullscreen }) {
  const { t } = useTranslation();
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(11, 29, 58, 0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: fullscreen ? `${safeTop(40)} 16px ${safeBottom(20)}` : '40px 16px 20px',
    }}>
      <div style={{
        background: tokens.bg, borderRadius: 24, width: '100%', maxWidth: 460,
        padding: '24px 22px 18px',
        boxShadow: '0 30px 80px rgba(11,29,58,0.35)',
        maxHeight: '100%', overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: tokens.primarySoft, color: tokens.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.Sparkle s={18} c={tokens.primary}/>
          </div>
          <div style={{
            fontFamily: tokens.serif, fontSize: fs(22), fontWeight: 500,
            color: tokens.ink, letterSpacing: -0.3, lineHeight: 1.15,
          }}>
            {t('aiConsent.title')}
          </div>
        </div>

        <div style={{
          fontFamily: tokens.sans, fontSize: fs(14), lineHeight: 1.55, color: tokens.ink2,
          marginBottom: 10,
        }}>
          {t('aiConsent.body1')}
        </div>
        <ul style={{
          margin: '0 0 14px',
          paddingInlineStart: '20px',
          fontFamily: tokens.sans, fontSize: fs(13.5), lineHeight: 1.55, color: tokens.ink,
        }}>
          <li style={{ marginBottom: 8 }}>{t('aiConsent.bullet1')}</li>
          <li>{t('aiConsent.bullet2')}</li>
        </ul>
        <div style={{
          fontFamily: tokens.sans, fontSize: fs(13), lineHeight: 1.55, color: tokens.ink2,
          marginBottom: 10,
        }}>
          {t('aiConsent.body2')}
        </div>
        <div style={{
          fontFamily: tokens.sans, fontSize: fs(12), lineHeight: 1.55, color: tokens.ink3,
          marginBottom: 18,
        }}>
          {t('aiConsent.body3')}
        </div>

        <button onClick={onAgree} style={{
          width: '100%', padding: '15px 20px', borderRadius: 16, border: 'none',
          background: tokens.ink, color: '#fff', cursor: 'pointer',
          fontFamily: tokens.sans, fontSize: fs(15), fontWeight: 600,
          marginBottom: 8,
        }}>
          {t('aiConsent.agree')}
        </button>
        <button onClick={onDecline} style={{
          width: '100%', padding: '12px 20px', borderRadius: 14,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: tokens.sans, fontSize: fs(13), color: tokens.ink3, fontWeight: 500,
        }}>
          {t('aiConsent.decline')}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { PrimaryButton } from './primitives';

export function ResponseScreen({ response, kid, error, onFollowup, onDone }) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whatOpen, setWhatOpen] = useState(false);

  if (error) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: tokens.serif, fontSize: 22, color: tokens.ink, marginBottom: 10 }}>
          {t('response.couldntReach')}
        </div>
        <div style={{ fontFamily: tokens.sans, fontSize: 14, lineHeight: 1.5, color: tokens.ink2, marginBottom: 18 }}>
          {String(error)}
        </div>
        <PrimaryButton onClick={onDone} full>{t('common.close')}</PrimaryButton>
      </div>
    );
  }

  if (!response) return null;

  const trySection = response.sections?.find((s) => s.kind === 'try');
  const whySection = response.sections?.find((s) => s.kind === 'why');
  const whatSection = response.sections?.find((s) => s.kind === 'what');
  const tonightSection = response.sections?.find((s) => s.kind === 'tonight');

  return (
    <div style={{ padding: '6px 20px 140px' }}>
      <div style={{
        background: `linear-gradient(160deg, ${tokens.primarySoft} 0%, ${tokens.surface} 100%)`,
        borderRadius: 24, padding: '22px 22px 24px', marginBottom: 14,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 22, right: 22,
          width: 36, height: 36, borderRadius: 36,
          background: `radial-gradient(circle at 35% 30%, #5A7EFF 0%, ${tokens.primary} 70%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 14px ${tokens.primary}40`,
        }}>
          <Icon.Sparkle s={16} c="#fff"/>
        </div>
        <div style={{ fontFamily: tokens.sans, fontSize: 12, fontWeight: 600, color: tokens.primaryInk, marginBottom: 10 }}>
          {kid?.name ? t('response.forKidJustNow', { kidName: kid.name }) : t('response.forYourChildJustNow')}
        </div>
        <div style={{
          fontFamily: tokens.serif, fontSize: 26, lineHeight: 1.2,
          color: tokens.ink, letterSpacing: -0.3, fontWeight: 500,
          marginBottom: 12, paddingRight: 40,
        }}>
          {response.title}.
        </div>
        <div style={{ fontFamily: tokens.sans, fontSize: 15, lineHeight: 1.5, color: tokens.ink2 }}>
          {response.summary}
        </div>
      </div>

      {trySection?.items?.length > 0 && (
        <div style={{
          background: tokens.surface, borderRadius: 22, padding: '20px 18px 8px',
          border: `1px solid ${tokens.line}`, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 28,
              background: tokens.primarySoft, color: tokens.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Sparkle s={14} c={tokens.primary}/>
            </div>
            <div style={{ fontFamily: tokens.serif, fontSize: 19, fontWeight: 600, color: tokens.ink, letterSpacing: -0.2 }}>
              {t('response.tryNextTime')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 14 }}>
            {trySection.items.map((it, j) => (
              <div key={j} style={{
                background: tokens.bg, borderRadius: 16, padding: '14px 14px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 28, flexShrink: 0,
                  background: tokens.surface, color: tokens.primary,
                  border: `1.5px solid ${tokens.primary}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: tokens.serif, fontSize: 14, fontWeight: 600,
                }}>{j + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: tokens.sans, fontSize: 15, fontWeight: 600, color: tokens.ink, marginBottom: 4, lineHeight: 1.3 }}>
                    {it.h}
                  </div>
                  <div style={{ fontFamily: tokens.sans, fontSize: 13.5, lineHeight: 1.5, color: tokens.ink2 }}>
                    {it.b}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tonightSection?.body && (
        <div style={{
          background: '#FFF8E8', borderRadius: 18, padding: '16px 18px',
          marginBottom: 12, border: '1px solid #F4E5BD',
          display: 'flex', gap: 12,
        }}>
          <div style={{ fontSize: 22, lineHeight: 1 }}>🌙</div>
          <div>
            <div style={{ fontFamily: tokens.sans, fontSize: 13, fontWeight: 700, color: '#8A6012', marginBottom: 4 }}>
              {t('response.tonightBeforeBed')}
            </div>
            <div style={{ fontFamily: tokens.sans, fontSize: 14, lineHeight: 1.5, color: '#5C4316' }}>
              {tonightSection.body}
            </div>
          </div>
        </div>
      )}

      {whySection?.body && (
        <button onClick={() => setWhyOpen(!whyOpen)} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: tokens.surface, border: `1px solid ${tokens.line}`,
          borderRadius: 16, padding: '14px 16px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: tokens.sans, fontSize: 14.5, fontWeight: 600, color: tokens.ink, marginBottom: whyOpen ? 8 : 0 }}>
              {t('response.tonightExpand')}
            </div>
            {whyOpen && (
              <div style={{ fontFamily: tokens.sans, fontSize: 13.5, lineHeight: 1.55, color: tokens.ink2, marginTop: 6 }}>
                {whySection.body}
              </div>
            )}
          </div>
          <div style={{ transform: whyOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}>
            <Icon.Chevron s={14} c={tokens.ink3}/>
          </div>
        </button>
      )}

      {whatSection?.body && (
        <button onClick={() => setWhatOpen(!whatOpen)} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: tokens.surface, border: `1px solid ${tokens.line}`,
          borderRadius: 16, padding: '14px 16px', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: tokens.sans, fontSize: 14.5, fontWeight: 600, color: tokens.ink, marginBottom: whatOpen ? 8 : 0 }}>
              {t('response.whatExpand')}
            </div>
            {whatOpen && (
              <div style={{ fontFamily: tokens.sans, fontSize: 13.5, lineHeight: 1.55, color: tokens.ink2, marginTop: 6, fontStyle: 'italic' }}>
                {whatSection.body}
              </div>
            )}
          </div>
          <div style={{ transform: whatOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}>
            <Icon.Chevron s={14} c={tokens.ink3}/>
          </div>
        </button>
      )}

      <div style={{
        textAlign: 'center', padding: '0 12px 18px',
        fontFamily: tokens.serif, fontSize: 14, lineHeight: 1.5,
        color: tokens.ink3, fontStyle: 'italic',
      }}>
        {t('response.closingLine')}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setSaved(!saved)} style={{
          width: 56, padding: '14px 0', borderRadius: 14,
          background: saved ? '#FFF4DA' : tokens.surface,
          border: `1px solid ${saved ? '#F4D28B' : tokens.line}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Star s={18} c={saved ? '#B58220' : tokens.ink2} filled={saved}/>
        </button>
        <PrimaryButton onClick={onFollowup} style={{ flex: 1 }}>
          {t('response.markHowItWent')} <Icon.ArrowRight s={15} c="#fff"/>
        </PrimaryButton>
      </div>
      <button onClick={onDone} style={{
        marginTop: 10, width: '100%', padding: 10, background: 'transparent',
        border: 'none', cursor: 'pointer',
        fontFamily: tokens.sans, fontSize: 13, color: tokens.ink3, fontWeight: 500,
      }}>{t('response.closeForNow')}</button>
    </div>
  );
}

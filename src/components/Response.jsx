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
        borderRadius: 24, padding: '22px 22px 24px', marginBottom: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 22, right: 22,
          width: 36, height: 36, borderRadius: 36,
          background: `radial-gradient(circle at 35% 30%, ${tokens.primary} 0%, ${tokens.primaryInk} 80%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 14px ${tokens.primary}40`,
        }}>
          <Icon.Sparkle s={16} c="#fff"/>
        </div>
        <div style={{ ...tokens.type.label, color: tokens.primaryInk, marginBottom: 12 }}>
          {kid?.name ? t('response.forKidJustNow', { kidName: kid.name }) : t('response.forYourChildJustNow')}
        </div>
        <div style={{
          ...tokens.type.h2,
          color: tokens.ink, paddingRight: 40, marginBottom: 14,
        }}>
          {response.title}.
        </div>
        <div style={{ height: 1, background: tokens.line, opacity: 0.6, marginBottom: 14 }}/>
        <div style={{ ...tokens.type.bodyLg, color: tokens.ink, fontWeight: 400 }}>
          {response.summary}
        </div>
      </div>

      {trySection?.items?.length > 0 && (
        <div style={{
          background: tokens.surface, borderRadius: 22, padding: '20px 18px 18px',
          border: `1px solid ${tokens.line}`, marginBottom: 14,
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 30,
              background: tokens.primary, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 3px 8px ${tokens.primary}40`,
            }}>
              <Icon.Sparkle s={15} c="#fff"/>
            </div>
            <div style={{ ...tokens.type.h3, color: tokens.ink }}>
              {t('response.tryNextTime')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trySection.items.map((it, j) => {
              const isPrimary = j === 0;
              return (
                <div key={j} style={{
                  background: isPrimary ? tokens.primarySoft : tokens.bg,
                  borderRadius: 16, padding: '14px 14px',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  border: isPrimary ? `1px solid ${tokens.primary}20` : '1px solid transparent',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 36, flexShrink: 0,
                    background: tokens.primary, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: tokens.serif, fontSize: it.icon ? 18 : 16, fontWeight: 600,
                    lineHeight: 1,
                  }}>{it.icon || (j + 1)}</div>
                  <div style={{ flex: 1, paddingTop: 1 }}>
                    <div style={{
                      ...tokens.type.bodyLg, color: tokens.ink,
                      marginBottom: 4, fontWeight: 600, lineHeight: 1.3,
                    }}>
                      {it.h}
                    </div>
                    <div style={{ ...tokens.type.bodySm, color: tokens.ink2 }}>
                      {it.b}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tonightSection?.body && (
        <div style={{
          background: '#FFF8E8', borderRadius: 16, padding: '14px 16px',
          marginBottom: 10, border: '1px solid #F4E5BD',
          display: 'flex', gap: 12,
        }}>
          <div style={{ fontSize: 20, lineHeight: 1 }}>🌙</div>
          <div>
            <div style={{ ...tokens.type.label, color: '#8A6012', marginBottom: 4 }}>
              {t('response.tonightBeforeBed')}
            </div>
            <div style={{ ...tokens.type.bodySm, color: '#5C4316', lineHeight: 1.55 }}>
              {tonightSection.body}
            </div>
          </div>
        </div>
      )}

      {whySection?.body && (
        <button onClick={() => setWhyOpen(!whyOpen)} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: 'transparent', border: `1px solid ${tokens.line}`,
          borderRadius: 14, padding: '12px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...tokens.type.bodySm, fontWeight: 600, color: tokens.ink2 }}>
              {t('response.tonightExpand')}
            </div>
            {whyOpen && (
              <div style={{ ...tokens.type.bodySm, color: tokens.ink2, marginTop: 8 }}>
                {whySection.body}
              </div>
            )}
          </div>
          <div style={{ transform: whyOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}>
            <Icon.Chevron s={13} c={tokens.ink3}/>
          </div>
        </button>
      )}

      {whatSection?.body && (
        <button onClick={() => setWhatOpen(!whatOpen)} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: 'transparent', border: `1px solid ${tokens.line}`,
          borderRadius: 14, padding: '12px 14px', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...tokens.type.bodySm, fontWeight: 600, color: tokens.ink2 }}>
              {t('response.whatExpand')}
            </div>
            {whatOpen && (
              <div style={{ ...tokens.type.bodySm, color: tokens.ink2, marginTop: 8, fontStyle: 'italic' }}>
                {whatSection.body}
              </div>
            )}
          </div>
          <div style={{ transform: whatOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}>
            <Icon.Chevron s={13} c={tokens.ink3}/>
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

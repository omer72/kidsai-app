import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, fs } from '../theme';
import { safeBottom, safeTop } from '../platform';
import { Icon } from './Icons';
import { IOSStatusBar } from './IOSFrame';

function MicArt() {
  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: 200,
          border: `1.5px solid ${tokens.primary}`,
          animation: `pg-ring 2.4s ease-out ${i * 0.55}s infinite`,
          opacity: 0.5,
        }}/>
      ))}
      <div style={{
        position: 'absolute', inset: 50, borderRadius: 200,
        background: `radial-gradient(circle at 35% 30%, ${tokens.primary} 0%, ${tokens.primaryInk} 80%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 18px 40px ${tokens.primary}55`,
      }}>
        <Icon.Mic s={42} c="#fff"/>
      </div>
    </div>
  );
}

function LensArt() {
  return (
    <div style={{ position: 'relative', width: 240, height: 200 }}>
      <div style={{
        position: 'absolute', top: 0, left: 20, right: 20, padding: 18,
        background: '#FFF', borderRadius: 16, border: `1px solid ${tokens.line}`,
        transform: 'rotate(-3deg)', boxShadow: '0 8px 24px rgba(11,29,58,0.08)',
      }}>
        <div style={{ height: 6, width: '60%', borderRadius: 4, background: tokens.ink, marginBottom: 8 }}/>
        <div style={{ height: 4, width: '90%', borderRadius: 4, background: tokens.line, marginBottom: 5 }}/>
        <div style={{ height: 4, width: '78%', borderRadius: 4, background: tokens.line }}/>
      </div>
      <div style={{
        position: 'absolute', top: 60, left: 10, right: 10, padding: 18,
        background: '#FFF', borderRadius: 16, border: `1px solid ${tokens.line}`,
        transform: 'rotate(2deg)', boxShadow: '0 12px 28px rgba(11,29,58,0.1)',
      }}>
        <div style={{ height: 8, width: 70, borderRadius: 4, background: tokens.primary, marginBottom: 10 }}/>
        <div style={{ height: 5, width: '95%', borderRadius: 4, background: tokens.line, marginBottom: 6 }}/>
        <div style={{ height: 5, width: '85%', borderRadius: 4, background: tokens.line, marginBottom: 6 }}/>
        <div style={{ height: 5, width: '70%', borderRadius: 4, background: tokens.line }}/>
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 30, width: 56, height: 56,
        borderRadius: 56, background: `radial-gradient(circle, ${tokens.primary} 0%, ${tokens.primaryInk} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 10px 22px ${tokens.primary}55`,
      }}>
        <Icon.Sparkle s={22} c="#fff"/>
      </div>
    </div>
  );
}

function MemoryArt() {
  return (
    <div style={{ position: 'relative', width: 260, height: 210 }}>
      <div style={{
        position: 'absolute', top: 4, insetInlineStart: 6, width: 148, padding: '12px 14px',
        background: '#FFF', borderRadius: 14, border: `1px solid ${tokens.line}`,
        transform: 'rotate(-7deg)', boxShadow: '0 8px 20px rgba(11,29,58,0.08)',
      }}>
        <div style={{ height: 6, width: 54, borderRadius: 4, background: tokens.ink3, marginBottom: 8, opacity: 0.55 }}/>
        <div style={{ height: 5, width: '100%', borderRadius: 4, background: tokens.line, marginBottom: 5 }}/>
        <div style={{ height: 5, width: '70%', borderRadius: 4, background: tokens.line }}/>
      </div>
      <div style={{
        position: 'absolute', top: 72, insetInlineStart: 112,
        width: 32, height: 32, borderRadius: 32, background: tokens.primarySoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tokens.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6"/>
        </svg>
      </div>
      <div style={{
        position: 'absolute', top: 112, insetInlineStart: 36, width: 200, padding: '14px 16px',
        background: '#FFF', borderRadius: 16, border: `1px solid ${tokens.primary}55`,
        boxShadow: `0 14px 28px ${tokens.primary}22`,
      }}>
        <div style={{ height: 7, width: 78, borderRadius: 4, background: tokens.primary, marginBottom: 10 }}/>
        <div style={{ height: 5, width: '100%', borderRadius: 4, background: tokens.line, marginBottom: 6 }}/>
        <div style={{ height: 5, width: '86%', borderRadius: 4, background: tokens.line, marginBottom: 6 }}/>
        <div style={{ height: 5, width: '62%', borderRadius: 4, background: tokens.line }}/>
      </div>
    </div>
  );
}

export function OnboardingScreen({ onDone, fullscreen }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const slides = [
    { eyebrow: t('onboarding.slide1.eyebrow'), title: t('onboarding.slide1.title'), body: t('onboarding.slide1.body'), art: 'mic' },
    { eyebrow: t('onboarding.slide2.eyebrow'), title: t('onboarding.slide2.title'), body: t('onboarding.slide2.body'), art: 'lens' },
    { eyebrow: t('onboarding.slide3.eyebrow'), title: t('onboarding.slide3.title'), body: t('onboarding.slide3.body'), art: 'memory' },
  ];
  const s = slides[i];

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      display: 'flex', flexDirection: 'column',
      background: tokens.bg,
    }}>
      {!fullscreen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <IOSStatusBar dark={false}/>
        </div>
      )}

      <button onClick={onDone} style={{
        position: 'absolute', top: fullscreen ? safeTop(20) : 58,
        right: 22, zIndex: 20,
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: tokens.sans, fontSize: fs(13), color: tokens.ink3, fontWeight: 500,
      }}>{t('common.skip')}</button>

      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
        display: 'flex', flexDirection: 'column',
        padding: fullscreen ? `${safeTop(60)} 28px 0` : '90px 28px 0',
        boxSizing: 'border-box',
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, marginBottom: 24 }}>
          {s.art === 'mic' && <MicArt/>}
          {s.art === 'lens' && <LensArt/>}
          {s.art === 'memory' && <MemoryArt/>}
        </div>

        <div>
          <div style={{
            fontFamily: tokens.sans, fontSize: fs(11), fontWeight: 700, color: tokens.primary,
            letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
          }}>{s.eyebrow}</div>
          <div style={{
            fontFamily: tokens.serif, fontSize: fs(28), lineHeight: 1.15, color: tokens.ink,
            letterSpacing: -0.6, fontWeight: 500, marginBottom: 14,
          }}>{s.title}</div>
          <div style={{ fontFamily: tokens.sans, fontSize: fs(15), lineHeight: 1.55, color: tokens.ink2 }}>
            {s.body}
          </div>
        </div>
      </div>

      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: fullscreen ? `20px 28px ${safeBottom(28)}` : '20px 28px 32px',
        background: tokens.bg,
      }}>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {slides.map((_, j) => (
            <div key={j} style={{
              height: 4, flex: j === i ? 3 : 1, borderRadius: 4,
              background: j <= i ? tokens.primary : tokens.line,
              transition: 'all .3s',
            }}/>
          ))}
        </div>
        <button onClick={() => (i < 2 ? setI(i + 1) : onDone())} style={{
          width: 56, height: 56, borderRadius: 56, border: 'none',
          background: tokens.ink, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 10px 22px ${tokens.ink}30`,
        }}>
          <Icon.ArrowRight s={20} c="#fff"/>
        </button>
      </div>
    </div>
  );
}

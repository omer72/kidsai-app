import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../theme';
import { Icon } from './Icons';

export function ThinkingScreen() {
  const { t } = useTranslation();
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const i = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(i);
  }, []);
  const lines = [t('thinking.step1'), t('thinking.step2'), t('thinking.step3')];
  return (
    <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 180,
          background: `radial-gradient(circle at 50% 50%, ${tokens.primary}26 0%, ${tokens.primary}00 65%)`,
          animation: 'pg-drift 8s ease-in-out infinite',
          pointerEvents: 'none',
        }}/>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              position: 'absolute', inset: 0, borderRadius: 120,
              border: `1.5px solid ${tokens.primary}`,
              animation: `pg-ring 2.2s ease-out ${i * 0.7}s infinite`,
              opacity: 0.5,
            }}/>
          ))}
          <div style={{
            position: 'absolute', inset: 30, borderRadius: 120,
            background: `radial-gradient(circle at 35% 30%, ${tokens.primary} 0%, ${tokens.primaryInk} 80%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 12px 30px ${tokens.primary}55`,
            animation: 'pg-breathe 3s ease-in-out infinite',
          }}>
            <Icon.Sparkle s={28} c="#fff"/>
          </div>
        </div>
      </div>
      <div style={{ ...tokens.type.h2, fontSize: 22, color: tokens.ink, marginBottom: 22, textAlign: 'center' }}>
        {t('thinking.title')}{'.'.repeat(dots)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        {lines.map((l, i) => {
          const active = dots > i;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 18, flexShrink: 0,
                background: active ? tokens.primary : tokens.line,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .4s',
              }}>
                {active && <Icon.Check s={11} c="#fff"/>}
              </div>
              <div style={{
                ...tokens.type.body,
                color: active ? tokens.ink : tokens.ink3,
                transition: 'color .4s',
              }}>{l}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

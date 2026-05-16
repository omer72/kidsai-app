import { useState } from 'react';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { IOSStatusBar } from './IOSFrame';
import { billingAvailable, restorePurchases } from '../billing';

export function WelcomeScreen({ onStart, onRestored, fullscreen }) {
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');

  const handleRestore = async () => {
    setRestoreMsg('');
    if (!billingAvailable()) {
      setRestoreMsg('Restore is only available on the App Store build.');
      return;
    }
    setRestoring(true);
    try {
      const next = await restorePurchases();
      if (next.entitled) {
        onRestored?.(next);
      } else {
        setRestoreMsg('No active subscription found on this Apple ID.');
      }
    } catch (err) {
      setRestoreMsg(err?.message || 'Restore failed.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
      background: `linear-gradient(180deg, ${tokens.bg} 0%, #FFF 55%, ${tokens.primarySoft} 100%)`,
    }}>
      <div style={{ position: 'absolute', top: 80, left: -60, width: 220, height: 220, borderRadius: 220,
        background: `radial-gradient(circle, ${tokens.primary}30 0%, transparent 70%)`, filter: 'blur(8px)' }}/>
      <div style={{ position: 'absolute', bottom: 200, right: -80, width: 260, height: 260, borderRadius: 260,
        background: `radial-gradient(circle, ${tokens.primary}25 0%, transparent 70%)`, filter: 'blur(10px)' }}/>

      {!fullscreen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <IOSStatusBar dark={false}/>
        </div>
      )}

      <div style={{
        position: 'relative', zIndex: 2, minHeight: '100%',
        display: 'flex', flexDirection: 'column',
        padding: fullscreen ? 'max(60px, env(safe-area-inset-top)) 28px max(40px, env(safe-area-inset-bottom))' : '90px 28px 40px',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `radial-gradient(circle at 30% 30%, #5A7EFF 0%, ${tokens.primary} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 14px ${tokens.primary}40`,
          }}>
            <Icon.Sparkle s={16} c="#fff"/>
          </div>
          <div style={{ fontFamily: tokens.serif, fontSize: 22, fontWeight: 600, color: tokens.ink, letterSpacing: -0.3 }}>
            kidsit ai
          </div>
        </div>

        <div style={{ marginBottom: 38 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#FFF', padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${tokens.line}`, marginBottom: 18,
            fontFamily: tokens.sans, fontSize: 11, fontWeight: 600, color: tokens.ink2, letterSpacing: 0.4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 6, background: '#4AAE8C' }}/>
            Trusted by 24,000 parents
          </div>
          <div style={{
            fontFamily: tokens.serif, fontSize: 40, lineHeight: 1.05, color: tokens.ink,
            letterSpacing: -1.2, fontWeight: 500, marginBottom: 16,
          }}>
            Parenting is<br/>hard.<br/>
            <span style={{ fontStyle: 'italic', color: tokens.primary }}>You don't have</span><br/>
            <span style={{ fontStyle: 'italic', color: tokens.primary }}>to do it alone.</span>
          </div>
          <div style={{
            fontFamily: tokens.sans, fontSize: 16, lineHeight: 1.5, color: tokens.ink2,
            maxWidth: 320,
          }}>
            Whisper what just happened. Get warm, science-backed guidance in 12 seconds.
          </div>
        </div>

        <button onClick={onStart} style={{
          width: '100%', padding: '17px 20px', borderRadius: 16, border: 'none',
          background: tokens.ink, color: '#fff', cursor: 'pointer',
          fontFamily: tokens.sans, fontSize: 16, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 14px 28px ${tokens.ink}30`,
        }}>
          Try your first moment — free
          <Icon.ArrowRight s={17} c="#fff"/>
        </button>
        <div style={{
          textAlign: 'center', marginTop: 14,
          fontFamily: tokens.sans, fontSize: 12, color: tokens.ink3,
        }}>
          Already a subscriber?{' '}
          <button onClick={handleRestore} disabled={restoring} style={{
            background: 'transparent', border: 'none', padding: 0,
            cursor: restoring ? 'not-allowed' : 'pointer',
            color: tokens.ink, fontWeight: 600, fontSize: 12,
            fontFamily: tokens.sans, textDecoration: 'underline',
          }}>
            {restoring ? 'Restoring…' : 'Restore'}
          </button>
        </div>
        {restoreMsg && (
          <div style={{
            textAlign: 'center', marginTop: 8,
            fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3,
          }}>{restoreMsg}</div>
        )}
        <div style={{
          textAlign: 'center', marginTop: 18, padding: '0 12px',
          fontFamily: tokens.sans, fontSize: 11, lineHeight: 1.5, color: tokens.ink3,
        }}>
          Kidsit AI offers reflective guidance, not medical or psychological advice. It does not diagnose or treat any condition. For clinical concerns about your child, please consult a qualified professional.
        </div>
      </div>
    </div>
  );
}

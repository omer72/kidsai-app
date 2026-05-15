import { useState, useEffect, useMemo } from 'react';
import { tokens } from '../theme';
import { Icon } from './Icons';

export function Avatar({ kid, size = 32, ring = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: kid.color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: tokens.sans, fontWeight: 600, fontSize: size * 0.4,
      boxShadow: ring ? `0 0 0 3px ${tokens.surface}, 0 0 0 4.5px ${kid.color}` : 'none',
      flexShrink: 0, letterSpacing: 0.2,
    }}>{kid.initials}</div>
  );
}

export function Chip({ active, onClick, children, dot, dense, style = {} }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: dense ? '6px 11px' : '9px 14px', borderRadius: 999,
      background: active ? tokens.primary : tokens.surface,
      color: active ? '#fff' : tokens.ink,
      border: `1px solid ${active ? tokens.primary : tokens.line}`,
      fontFamily: tokens.sans, fontSize: 14, fontWeight: 500,
      cursor: 'pointer', transition: 'all .15s',
      ...style,
    }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: 7, background: dot }}/>}
      {children}
    </button>
  );
}

export function Card({ children, style = {}, pad = 16 }) {
  return (
    <div style={{
      background: tokens.surface, borderRadius: 20, padding: pad,
      border: `1px solid ${tokens.line}`,
      ...style,
    }}>{children}</div>
  );
}

export function Label({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{
        fontFamily: tokens.sans, fontSize: 12, fontWeight: 600,
        color: tokens.ink2, letterSpacing: 0.8, textTransform: 'uppercase',
      }}>{children}</div>
      {hint && <div style={{ fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3 }}>{hint}</div>}
    </div>
  );
}

export function LiveWaveform({ active, bars = 34, height = 56, color = tokens.primary }) {
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSeed((s) => s + 1), 90);
    return () => clearInterval(t);
  }, [active]);
  const heights = useMemo(() => {
    const arr = [];
    for (let i = 0; i < bars; i++) {
      const base = 0.22 + 0.78 * Math.abs(Math.sin((i + seed * 0.6) * 0.55) * Math.cos(i * 0.31 + seed * 0.2));
      arr.push(active ? base : 0.18 + 0.08 * Math.sin(i * 0.8));
    }
    return arr;
  }, [seed, bars, active]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height, width: '100%' }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h * 100}%`, borderRadius: 3,
          background: color, opacity: active ? 0.35 + h * 0.65 : 0.28,
          transition: 'height .12s ease',
        }}/>
      ))}
    </div>
  );
}

export function MicButton({ recording, onStart, onStop, size = 164, disabled = false }) {
  const rings = [0, 1, 2];
  const handleStart = () => { if (!disabled) onStart(); };
  const handleStop = () => { if (!disabled) onStop(); };
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {recording && !disabled && rings.map((i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: size,
          border: `1.5px solid ${tokens.primary}`,
          animation: `pg-ring 1.8s ease-out ${i * 0.6}s infinite`,
          opacity: 0.6, pointerEvents: 'none',
        }}/>
      ))}
      <button
        disabled={disabled}
        onMouseDown={handleStart} onMouseUp={handleStop}
        onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
        onTouchEnd={(e) => { e.preventDefault(); handleStop(); }}
        onMouseLeave={() => { if (recording && !disabled) onStop(); }}
        style={{
          width: size, height: size, borderRadius: size, border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer', padding: 0, position: 'relative',
          background: disabled
            ? tokens.surfaceAlt
            : recording
              ? `radial-gradient(circle at 35% 30%, #5A7EFF 0%, ${tokens.primary} 60%, ${tokens.primaryInk} 100%)`
              : `radial-gradient(circle at 35% 30%, #5A7EFF 0%, ${tokens.primary} 70%)`,
          boxShadow: disabled
            ? 'none'
            : recording
              ? `0 18px 38px rgba(46,91,255,0.5), inset 0 2px 4px rgba(255,255,255,0.3)`
              : `0 14px 28px rgba(46,91,255,0.35), inset 0 2px 4px rgba(255,255,255,0.3)`,
          transition: 'transform .1s ease',
          transform: recording && !disabled ? 'scale(0.97)' : 'scale(1)',
          color: disabled ? tokens.ink3 : '#fff',
          opacity: disabled ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon.Mic s={size * 0.36} c={disabled ? tokens.ink3 : '#fff'}/>
      </button>
    </div>
  );
}

export function Segmented({ options, value, onChange, style = {} }) {
  return (
    <div style={{
      display: 'inline-flex', background: tokens.surfaceAlt, borderRadius: 12,
      padding: 3, gap: 2, ...style,
    }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: value === o.value ? tokens.surface : 'transparent',
          color: value === o.value ? tokens.ink : tokens.ink2,
          fontFamily: tokens.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          boxShadow: value === o.value ? '0 1px 3px rgba(11,29,58,0.08)' : 'none',
          transition: 'all .15s',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, full, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '14px 20px', borderRadius: 14, border: 'none',
      background: disabled ? tokens.surfaceAlt : tokens.ink,
      color: disabled ? tokens.ink3 : '#fff',
      fontFamily: tokens.sans, fontSize: 15, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : 'auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'all .15s', ...style,
    }}>{children}</button>
  );
}

export function GhostButton({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      padding: '12px 16px', borderRadius: 12, border: `1px solid ${tokens.line}`,
      background: tokens.surface, color: tokens.ink,
      fontFamily: tokens.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 8, ...style,
    }}>{children}</button>
  );
}

export function TabBar({ current, onChange }) {
  const tabs = [
    { id: 'home', icon: Icon.Home, label: 'Home' },
    { id: 'history', icon: Icon.Clock, label: 'History' },
    { id: 'kids', icon: Icon.Kid, label: 'Kids' },
    { id: 'settings', icon: Icon.Settings, label: 'Settings' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
      paddingBottom: 'max(28px, env(safe-area-inset-bottom))', paddingTop: 10,
      background: `linear-gradient(to top, ${tokens.bg} 60%, transparent 100%)`,
      display: 'flex', justifyContent: 'center', gap: 6,
    }}>
      <div style={{
        display: 'flex', gap: 2, background: tokens.surface,
        borderRadius: 999, padding: 5,
        border: `1px solid ${tokens.line}`,
        boxShadow: '0 6px 18px rgba(11,29,58,0.08)',
      }}>
        {tabs.map((t) => {
          const active = t.id === current;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              border: 'none', background: active ? tokens.ink : 'transparent',
              color: active ? '#fff' : tokens.ink2,
              padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: tokens.sans, fontSize: 13, fontWeight: 600,
              transition: 'all .15s',
            }}>
              <t.icon s={16} c={active ? '#fff' : tokens.ink2}/>
              {active && t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

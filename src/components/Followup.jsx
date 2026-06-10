import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { Label, PrimaryButton } from './primitives';

export function FollowupScreen({ kid, onDone }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(null);
  const [note, setNote] = useState('');
  const ratings = [
    { id: 'worse', label: t('followup.rating.worse'), color: tokens.danger },
    { id: 'same', label: t('followup.rating.same'), color: tokens.ink3 },
    { id: 'better', label: t('followup.rating.better'), color: tokens.success },
    { id: 'great', label: t('followup.rating.great'), color: tokens.primary },
  ];
  return (
    <div style={{ padding: '14px 22px 140px' }}>
      <div style={{
        fontFamily: tokens.sans, fontSize: 11, fontWeight: 600,
        color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
      }}>{t('followup.eyebrow')}</div>
      <div style={{
        fontFamily: tokens.serif, fontSize: 26, lineHeight: 1.2,
        color: tokens.ink, letterSpacing: -0.3, marginBottom: 8,
      }}>{t('followup.title')}</div>
      <div style={{
        fontFamily: tokens.sans, fontSize: 14, lineHeight: 1.5,
        color: tokens.ink2, marginBottom: 20,
      }}>
        {kid?.name ? t('followup.subhead', { kidName: kid.name }) : t('followup.subheadGeneric')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {ratings.map((r) => {
          const active = rating === r.id;
          return (
            <button key={r.id} onClick={() => setRating(r.id)} style={{
              padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
              background: tokens.surface,
              border: `1.5px solid ${active ? r.color : tokens.line}`,
              fontFamily: tokens.sans, fontSize: 15, fontWeight: 600,
              color: tokens.ink, textAlign: 'start',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'all .15s',
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 10, background: r.color }}/>
              {r.label}
              {active && <span style={{ marginLeft: 'auto' }}><Icon.Check s={18} c={r.color}/></span>}
            </button>
          );
        })}
      </div>

      <Label>{t('followup.noteLabel')}</Label>
      <textarea
        value={note} onChange={(e) => setNote(e.target.value)}
        placeholder={t('followup.notePlaceholder')}
        style={{
          width: '100%', minHeight: 90, padding: 14, borderRadius: 14,
          background: tokens.surface, border: `1px solid ${tokens.line}`,
          fontFamily: tokens.sans, fontSize: 14, color: tokens.ink,
          resize: 'none', outline: 'none', boxSizing: 'border-box',
        }}
      />

      <PrimaryButton full onClick={() => onDone({ rating, note })} disabled={!rating} style={{ marginTop: 16 }}>
        {kid?.name ? t('followup.saveTo', { kidName: kid.name }) : t('followup.saveToLog')} <Icon.Check s={16} c={rating ? '#fff' : tokens.ink3}/>
      </PrimaryButton>
    </div>
  );
}

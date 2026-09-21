import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, fs } from '../theme';
import { Icon } from './Icons';
import { Chip, PrimaryButton } from './primitives';
import { INTAKE_QUESTIONS } from '../constants';

const EMPTY = { answers: {}, other: {}, text: {} };

// One question per screen. Chip questions store an array of option ids in
// `answers[qid]`; the "Other" chip reveals a short field kept in `other[qid]`;
// text questions store a string in `text[qid]`.
export function KidIntake({ kidName, initial, onSave, onCancel }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [state, setState] = useState(() => ({ ...EMPTY, ...(initial || {}) }));

  const q = INTAKE_QUESTIONS[i];
  const last = i === INTAKE_QUESTIONS.length - 1;
  const picked = state.answers[q.id] || [];
  const otherOption = q.options?.find((o) => o.other);
  const otherPicked = otherOption && picked.includes(otherOption.id);
  const answered = q.text ? !!state.text[q.id]?.trim() : picked.length > 0;
  const required = !!q.required;

  const toggle = (o) => {
    const on = picked.includes(o.id);
    const next = on ? picked.filter((x) => x !== o.id)
      : q.max === 1 ? [o.id]
      : picked.length >= q.max ? picked
      : [...picked, o.id];
    setState((s) => ({ ...s, answers: { ...s.answers, [q.id]: next } }));
  };

  const setOther = (v) => setState((s) => ({ ...s, other: { ...s.other, [q.id]: v } }));
  const setText = (v) => setState((s) => ({ ...s, text: { ...s.text, [q.id]: v } }));

  const advance = () => {
    if (last) {
      onSave({ ...state, completedAt: Date.now() });
      setDone(true);
    } else {
      setI(i + 1);
    }
  };

  const back = () => (i === 0 ? onCancel() : setI(i - 1));

  const inputStyle = {
    padding: 12, borderRadius: 10, border: `1px solid ${tokens.line}`,
    fontFamily: tokens.sans, fontSize: fs(15), outline: 'none',
    background: tokens.surface, color: tokens.ink, width: '100%', boxSizing: 'border-box',
  };

  if (done) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 56, margin: '0 auto 18px',
          background: tokens.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Check s={26} c="#fff"/>
        </div>
        <div style={{
          fontFamily: tokens.serif, fontSize: fs(22), lineHeight: 1.3, color: tokens.ink,
          letterSpacing: -0.3, fontWeight: 500, marginBottom: 22,
        }}>{t('intake.thanks')}</div>
        <PrimaryButton onClick={onCancel}>{t('common.done')}</PrimaryButton>
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {INTAKE_QUESTIONS.map((_, j) => (
          <div key={j} style={{
            height: 4, flex: 1, borderRadius: 4,
            background: j <= i ? tokens.primary : tokens.line, transition: 'all .25s',
          }}/>
        ))}
      </div>

      <div style={{
        fontFamily: tokens.sans, fontSize: fs(11), fontWeight: 700, color: tokens.ink3,
        letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
      }}>{t('intake.title')} · {t('intake.step', { current: i + 1, total: INTAKE_QUESTIONS.length })}</div>

      <div style={{
        fontFamily: tokens.serif, fontSize: fs(24), lineHeight: 1.25, color: tokens.ink,
        letterSpacing: -0.3, fontWeight: 500, marginBottom: 6,
      }}>{t(`intake.q.${q.id}.title`, { name: kidName })}</div>

      <div style={{ fontFamily: tokens.sans, fontSize: fs(13), color: tokens.ink3, marginBottom: 16 }}>
        {q.max > 1 ? t('intake.selectUpTo', { count: q.max }) : required ? '' : t('intake.optional')}
      </div>

      {q.text ? (
        <textarea
          rows={4} autoFocus value={state.text[q.id] || ''} onChange={(e) => setText(e.target.value)}
          placeholder={t(`intake.q.${q.id}.placeholder`)}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.45 }}
        />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {q.options.map((o) => {
            const on = picked.includes(o.id);
            const full = !on && q.max > 1 && picked.length >= q.max;
            return (
              <Chip key={o.id} active={on} onClick={() => toggle(o)} style={full ? { opacity: 0.4 } : {}}>
                {t(`intake.q.${q.id}.${o.id}`)}
              </Chip>
            );
          })}
        </div>
      )}

      {otherPicked && (
        <input
          autoFocus inputMode={otherOption.numeric ? 'numeric' : 'text'}
          value={state.other[q.id] || ''} onChange={(e) => setOther(e.target.value)}
          placeholder={t(`intake.q.${q.id}.otherPlaceholder`)}
          style={{ ...inputStyle, marginTop: 12 }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button onClick={back} style={{
          padding: '14px 16px', borderRadius: 14, background: 'transparent',
          border: `1px solid ${tokens.line}`, cursor: 'pointer',
          fontFamily: tokens.sans, fontSize: fs(14), fontWeight: 500, color: tokens.ink2,
        }}>{t('common.back')}</button>
        {!required && !answered && (
          <button onClick={advance} style={{
            padding: '14px 16px', borderRadius: 14, background: 'transparent',
            border: 'none', cursor: 'pointer',
            fontFamily: tokens.sans, fontSize: fs(14), fontWeight: 500, color: tokens.ink3,
          }}>{t('common.skip')}</button>
        )}
        <PrimaryButton onClick={advance} disabled={required && !answered} style={{ flex: 1 }}>
          {last ? t('intake.finish') : t('common.continue')}
        </PrimaryButton>
      </div>
    </div>
  );
}

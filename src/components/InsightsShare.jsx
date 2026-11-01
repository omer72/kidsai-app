import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, fs } from '../theme';
import { useHardwareBack } from '../backbutton';
import { isNativeApp, storePlatform } from '../platform';
import {
  buildInsightsPayload,
  moveLabel,
  situationLabel,
} from '../digest';
import { APP_VERSION, postInsights } from '../insights';

function sheetButtonStyle(disabled) {
  return {
    flex: '1 1 0',
    minWidth: 0,
    padding: '12px 10px',
    borderRadius: 12,
    border: `1px solid ${tokens.line}`,
    background: tokens.surface,
    color: tokens.ink,
    fontFamily: tokens.sans,
    fontSize: fs(14),
    fontWeight: 600,
    lineHeight: 1.3,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.55 : 1,
  };
}

export function EqualActions({ startLabel, endLabel, onStart, onEnd, endDisabled = false }) {
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <button type="button" onClick={onStart} style={sheetButtonStyle(false)}>{startLabel}</button>
      <button type="button" onClick={onEnd} disabled={endDisabled} style={sheetButtonStyle(endDisabled)}>{endLabel}</button>
    </div>
  );
}

function Sheet({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 140,
        background: 'rgba(11,29,58,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: tokens.bg,
          width: '100%',
          maxWidth: 460,
          maxHeight: 'min(88vh, 740px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          borderRadius: 20,
          padding: 16,
          border: `1px solid ${tokens.line}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ShareExplainer({ open, onConfirm, onCancel }) {
  const { t } = useTranslation();
  useHardwareBack(() => {
    if (!open) return false;
    onCancel();
    return true;
  }, 130);
  if (!open) return null;
  return (
    <Sheet onClose={onCancel}>
      <div style={{ ...tokens.type.h3, color: tokens.ink, marginBottom: 8 }}>{t('insights.explainTitle')}</div>
      <p style={{ ...tokens.type.bodySm, color: tokens.ink2, margin: '0 0 10px' }}>{t('insights.explainBody')}</p>
      <p style={{ ...tokens.type.bodySm, color: tokens.ink, margin: '0 0 10px' }}>{t('insights.explainSent')}</p>
      <p style={{ ...tokens.type.bodySm, color: tokens.ink2, margin: '0 0 16px' }}>{t('insights.explainNot')}</p>
      <EqualActions
        startLabel={t('insights.notNow')}
        endLabel={t('insights.turnOn')}
        onStart={onCancel}
        onEnd={onConfirm}
      />
    </Sheet>
  );
}

function CheckRow({ checked, onChange, label }) {
  return (
    <label style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '8px 0', maxWidth: '100%',
      fontFamily: tokens.sans, fontSize: fs(14), color: tokens.ink,
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, flexShrink: 0 }}
      />
      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label}</span>
    </label>
  );
}

export function InsightsShare({
  open, onClose, history, kid, kids, cadence, now, onSent,
}) {
  const { t, i18n } = useTranslation();
  const [includeSituations, setIncludeSituations] = useState(true);
  const [includeMoves, setIncludeMoves] = useState(true);
  const [includeRating, setIncludeRating] = useState(true);
  const [includeText, setIncludeText] = useState(true);
  const [rating, setRating] = useState(null);
  const [text, setText] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useHardwareBack(() => {
    if (!open) return false;
    onClose();
    return true;
  }, 130);

  const built = useMemo(() => buildInsightsPayload({
    history,
    kidId: kid?.id,
    cadence,
    now,
    lang: i18n.language,
    platform: storePlatform(),
    appVersion: APP_VERSION,
    rating: includeRating ? rating : null,
    freeText: includeText ? text : '',
    kids,
    includeSituations,
    includeMoves,
    includeRating,
    includeFreeText: includeText,
  }), [
    history, kid, cadence, now, i18n.language, rating, text, kids,
    includeSituations, includeMoves, includeRating, includeText,
  ]);

  if (!open || !isNativeApp()) return null;
  const { payload, scrubbed } = built;
  const lang = i18n.language;
  const lines = [];
  if (!payload.situations.length) lines.push(t('insights.humanEmptyCounts'));
  for (const row of payload.situations) {
    lines.push(`${situationLabel(row.type, lang)}: ${t('digest.helpedLine', {
      worked: row.better + row.great,
      notWorked: row.same + row.worse,
      unrated: row.unrated,
    })}`);
  }
  for (const row of payload.moves || []) {
    lines.push(`${moveLabel(row.move, lang)}: ${row.worked} / ${row.not_worked}`);
  }
  if (payload.rating) lines.push(t('insights.humanRating', { rating: payload.rating }));
  lines.push(t('insights.humanWeek', { week: payload.period_key }));

  const send = async () => {
    if (!isNativeApp()) return;
    if (status === 'sending') return;
    setStatus('sending');
    setError('');
    try {
      await postInsights(payload);
      setStatus('sent');
      onSent(payload.period_key);
    } catch (err) {
      setStatus('idle');
      setError(err?.message || t('insights.error'));
    }
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ ...tokens.type.h3, color: tokens.ink, marginBottom: 6 }}>{t('insights.previewTitle')}</div>
      <p style={{ ...tokens.type.bodySm, color: tokens.ink2, margin: '0 0 8px' }}>{t('insights.previewIntro')}</p>
      <CheckRow checked={includeSituations} onChange={setIncludeSituations} label={t('insights.includeCounts')} />
      <CheckRow checked={includeMoves} onChange={setIncludeMoves} label={t('insights.includeMoves')} />
      <CheckRow checked={includeRating} onChange={setIncludeRating} label={t('insights.includeRating')} />
      <CheckRow checked={includeText} onChange={setIncludeText} label={t('insights.includeText')} />

      <div style={{ ...tokens.type.bodySm, fontWeight: 600, color: tokens.ink, margin: '8px 0' }}>
        {t('insights.ratingLabel')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(rating === n ? null : n)}
            style={{
              ...sheetButtonStyle(false),
              flex: '1 1 44px',
              background: rating === n ? tokens.ink : tokens.surface,
              color: rating === n ? '#fff' : tokens.ink,
              borderColor: rating === n ? tokens.ink : tokens.line,
            }}
          >{n}</button>
        ))}
      </div>

      <div style={{ ...tokens.type.bodySm, fontWeight: 600, color: tokens.ink, marginBottom: 6 }}>{t('insights.textLabel')}</div>
      <p style={{ ...tokens.type.bodySm, color: tokens.ink2, margin: '0 0 8px' }}>{t('insights.textWarning')}</p>
      <textarea
        dir="auto"
        value={text}
        maxLength={500}
        onChange={(e) => setText(e.target.value)}
        style={{
          width: '100%', maxWidth: '100%', boxSizing: 'border-box',
          minHeight: 72, resize: 'vertical',
          borderRadius: 12, border: `1px solid ${tokens.line}`,
          padding: 10, fontFamily: tokens.sans, fontSize: fs(14),
          color: tokens.ink, background: tokens.surface,
        }}
      />
      {includeText && scrubbed && (
        <div dir="auto" style={{
          marginTop: 8, padding: 10, borderRadius: 12,
          background: tokens.surfaceAlt, color: tokens.ink2,
          fontFamily: tokens.sans, fontSize: fs(13), lineHeight: 1.45,
          overflowWrap: 'anywhere',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('insights.scrubbedLabel')}</div>
          {scrubbed}
        </div>
      )}

      <div style={{
        margin: '12px 0', padding: 10, borderRadius: 12,
        background: tokens.surface, border: `1px solid ${tokens.line}`,
      }}>
        {lines.map((line) => (
          <div key={line} dir="auto" style={{
            ...tokens.type.bodySm, color: tokens.ink, marginBottom: 4, overflowWrap: 'anywhere',
          }}>{line}</div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowJson((v) => !v)}
        style={{
          background: 'transparent', border: 'none', padding: 0, marginBottom: 8,
          color: tokens.ink3, fontFamily: tokens.sans, fontSize: fs(13), fontWeight: 600, cursor: 'pointer',
        }}
      >{showJson ? t('insights.hideJson') : t('insights.showJson')}</button>
      {showJson && (
        <pre style={{
          margin: '0 0 12px', padding: 10, borderRadius: 12,
          background: tokens.surfaceAlt, color: tokens.ink,
          whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word',
          maxWidth: '100%', fontSize: 11, lineHeight: 1.45,
          direction: 'ltr', textAlign: 'left',
        }}>{JSON.stringify(payload, null, 2)}</pre>
      )}

      {status === 'sent' ? (
        <div>
          <div style={{ ...tokens.type.h3, color: tokens.ink, marginBottom: 6 }}>{t('insights.sentTitle')}</div>
          <p style={{ ...tokens.type.bodySm, color: tokens.ink2, margin: '0 0 12px' }}>{t('insights.sentBody')}</p>
          <button type="button" onClick={onClose} style={{ ...sheetButtonStyle(false), width: '100%' }}>{t('digest.back')}</button>
        </div>
      ) : (
        <>
          {error && (
            <p style={{ ...tokens.type.bodySm, color: tokens.danger, margin: '0 0 10px', overflowWrap: 'anywhere' }}>
              {t('insights.error')}
            </p>
          )}
          <EqualActions
            startLabel={t('insights.notNow')}
            endLabel={status === 'sending' ? t('insights.sending') : t('insights.send')}
            onStart={onClose}
            onEnd={send}
            endDisabled={status === 'sending'}
          />
        </>
      )}
    </Sheet>
  );
}

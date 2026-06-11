import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { Avatar, Card, Chip, ConfirmDialog, Label, LiveWaveform, MicButton, PrimaryButton } from './primitives';
import { isStoryThin } from '../story';
import { LOCATIONS, MOODS, INVOLVED, URGENCY } from '../constants';
import { startRecording, stopRecording, cancelRecording } from '../recorder';
import { transcribeAudio, hasApiKey } from '../openai';
import { useHardwareBack } from '../backbutton';

export function FlowB({ kids, activeKid, setActiveKid, onSubmit, ensureConsent }) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [story, setStory] = useState('');
  const [ctx, setCtx] = useState({ location: null, mood: null, involved: null, urgency: null });
  const [recError, setRecError] = useState('');
  const [thinNudgeOpen, setThinNudgeOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (recording) {
      const start = Date.now();
      timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  useEffect(() => () => cancelRecording(), []);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const canSubmit = !transcribing && (story.trim() || hasRecording) && ctx.location && ctx.mood && ctx.urgency;

  useHardwareBack(() => (recording || transcribing), 60); // don't interrupt capture

  const handleMicStart = async () => {
    setRecError('');
    // Consent gates recording itself — voice is transcribed by OpenAI, so it
    // must never start without the user's OK.
    if (ensureConsent && !(await ensureConsent())) {
      setRecError(t('flowA.errors.consentNeeded'));
      return;
    }
    try {
      await startRecording();
      setRecording(true);
      setElapsed(0);
    } catch (err) {
      console.error('mic start failed:', err);
      setRecError(err.name === 'NotAllowedError' ? 'Microphone permission denied.' : 'Could not access microphone.');
    }
  };

  const handleMicStop = async () => {
    if (!recording) return;
    setRecording(false);
    if (elapsed < 0.4) { cancelRecording(); return; }
    setTranscribing(true);
    try {
      const blob = await stopRecording();
      if (!blob || blob.size < 1000) {
        const e = new Error(t('flowA.errors.tooShort'));
        e.friendly = true;
        throw e;
      }
      if (!hasApiKey()) {
        setHasRecording(true);
        return;
      }
      const text = await transcribeAudio(blob);
      setStory((prev) => (prev.trim() ? `${prev.trim()} ${text.trim()}` : text.trim()));
      setHasRecording(true);
    } catch (err) {
      console.error('transcribe failed:', err);
      setRecError(err.friendly ? err.message : t('flowA.errors.transcriptionFailed'));
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div style={{ padding: '12px 16px 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 6px' }}>
        <div style={{ fontFamily: tokens.serif, fontSize: 22, fontWeight: 500, color: tokens.ink, letterSpacing: -0.2 }}>
          New moment
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {kids.map((k) => (
            <button key={k.id} onClick={() => setActiveKid(k.id)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
              <Avatar kid={k} size={32} ring={k.id === activeKid}/>
            </button>
          ))}
        </div>
      </div>

      <Card pad={18} style={{
        marginBottom: 12,
        background: recording ? tokens.primarySoft : tokens.surface,
        borderColor: recording ? 'transparent' : tokens.line, transition: 'all .25s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <MicButton
            recording={recording}
            onStart={handleMicStart}
            onStop={handleMicStop}
            size={76}
            disabled={kids.length === 0 || transcribing}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: tokens.sans, fontSize: 12, fontWeight: 600,
              color: tokens.primaryInk, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4,
            }}>
              {recording ? 'Listening' : transcribing ? 'Transcribing…' : hasRecording ? 'Recorded' : 'Hold to speak'}
            </div>
            <div style={{ fontFamily: tokens.sans, fontSize: 14, color: tokens.ink2, lineHeight: 1.4 }}>
              {recording ? 'Tell the whole story.' : transcribing ? 'Turning your voice into words…' : hasRecording ? `${fmt(elapsed)} · review below` : 'Press and hold the mic'}
            </div>
            <div style={{ marginTop: 8, height: 26 }}>
              <LiveWaveform active={recording} bars={28} height={26}/>
            </div>
            {recError && (
              <div style={{ marginTop: 6, fontFamily: tokens.sans, fontSize: 12, color: tokens.danger }}>{recError}</div>
            )}
          </div>
        </div>
        <textarea
          value={story} onChange={(e) => setStory(e.target.value)}
          placeholder="Or type a few sentences about what happened…"
          style={{
            width: '100%', minHeight: 70, padding: 12, borderRadius: 12,
            background: tokens.surface, border: `1px solid ${tokens.line}`,
            fontFamily: tokens.sans, fontSize: 14, color: tokens.ink, lineHeight: 1.5,
            resize: 'none', outline: 'none', boxSizing: 'border-box', marginTop: 12,
          }}
        />
      </Card>

      <Card pad={16} style={{ marginBottom: 12 }}>
        <Label hint="required">Where</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {LOCATIONS.map((o) => (
            <Chip key={o.id} dense active={ctx.location === o.id} onClick={() => setCtx({ ...ctx, location: o.id })}>
              {t(o.labelKey)}
            </Chip>
          ))}
        </div>

        <Label hint="required">Mood</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
          {MOODS.map((o) => {
            const active = ctx.mood === o.id;
            return (
              <button key={o.id} onClick={() => setCtx({ ...ctx, mood: o.id })} style={{
                padding: '11px 8px', borderRadius: 12, cursor: 'pointer',
                background: active ? tokens.primary : tokens.surfaceAlt,
                color: active ? '#fff' : tokens.ink, border: 'none',
                fontFamily: tokens.sans, fontSize: 13, fontWeight: 600,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 16 }}>{o.glyph}</span>
                {t(o.labelKey)}
              </button>
            );
          })}
        </div>

        <Label>Who</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {INVOLVED.map((o) => (
            <Chip key={o.id} dense active={ctx.involved === o.id} onClick={() => setCtx({ ...ctx, involved: o.id })}>
              {t(o.labelKey)}
            </Chip>
          ))}
        </div>

        <Label hint="required">Urgency</Label>
        <div style={{ display: 'flex', gap: 6 }}>
          {URGENCY.map((o) => {
            const active = ctx.urgency === o.id;
            return (
              <button key={o.id} onClick={() => setCtx({ ...ctx, urgency: o.id })} style={{
                flex: 1, padding: '11px 8px', borderRadius: 12, cursor: 'pointer',
                background: active ? tokens.ink : tokens.surfaceAlt,
                color: active ? '#fff' : tokens.ink, border: 'none', textAlign: 'start',
                fontFamily: tokens.sans, fontSize: 13, fontWeight: 600,
                display: 'flex', flexDirection: 'column', gap: 2,
                transition: 'all .15s',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 6, background: o.dot }}/>
                  {t(o.labelKey)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: active ? 'rgba(255,255,255,0.7)' : tokens.ink3 }}>
                  {t(o.descKey)}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <PrimaryButton
        full disabled={!canSubmit}
        onClick={() => {
          // demo mode can hold a recording with no transcript — nothing to judge
          const transcriptless = hasRecording && !story.trim();
          if (!transcriptless && isStoryThin(story)) { setThinNudgeOpen(true); return; }
          onSubmit({ story, ctx });
        }}
      >
        <Icon.Sparkle s={14} c={canSubmit ? '#fff' : tokens.ink3}/>
        Get guidance
      </PrimaryButton>

      <ConfirmDialog
        open={thinNudgeOpen}
        title={t('thinStory.title')}
        body={t('thinStory.body')}
        confirmLabel={t('thinStory.continueAnyway')}
        cancelLabel={t('thinStory.addMore')}
        onConfirm={() => { setThinNudgeOpen(false); onSubmit({ story, ctx }); }}
        onCancel={() => setThinNudgeOpen(false)}
      />
    </div>
  );
}

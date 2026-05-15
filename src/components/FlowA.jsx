import { useState, useEffect, useRef } from 'react';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { Avatar, Card, Chip, GhostButton, LiveWaveform, MicButton, PrimaryButton } from './primitives';
import { LOCATIONS, MOODS, INVOLVED, URGENCY } from '../constants';
import { startRecording, stopRecording, cancelRecording } from '../recorder';
import { transcribeAudio, hasApiKey } from '../openai';

export function FlowA({ kids, activeKid, setActiveKid, onSubmit, onAddKid }) {
  const [stage, setStage] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [story, setStory] = useState('');
  const [ctx, setCtx] = useState({ location: null, mood: null, involved: null, urgency: null });
  const [step, setStep] = useState(0);
  const [recError, setRecError] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (stage === 'recording') {
      const start = Date.now();
      timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [stage]);

  useEffect(() => () => cancelRecording(), []);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const handleMicStart = async () => {
    setRecError('');
    try {
      await startRecording();
      setStage('recording');
    } catch (err) {
      console.error('mic start failed:', err);
      setRecError(err.name === 'NotAllowedError' ? 'Microphone permission denied.' : 'Could not access microphone.');
      setStage('idle');
    }
  };

  const handleMicStop = async () => {
    if (stage !== 'recording') { setStage('idle'); return; }
    if (elapsed < 0.4) {
      cancelRecording();
      setStage('idle');
      return;
    }
    setStage('transcribing');
    try {
      const blob = await stopRecording();
      if (!blob || blob.size === 0) throw new Error('Empty recording');
      if (!hasApiKey()) {
        setStory('(demo) imagine a story you would have spoken.');
        setStage('recorded');
        return;
      }
      const text = (await transcribeAudio(blob)).trim();
      setStory(text);
      if (!text) setRecError('We couldn’t hear anything. Type below or try again.');
      setStage('recorded');
    } catch (err) {
      console.error('transcribe failed:', err);
      setRecError(err.message || 'Transcription failed. Type instead.');
      setStage('recorded');
    }
  };

  if (stage === 'idle' || stage === 'recording' || stage === 'transcribing') {
    const h = new Date().getHours();
    const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const activeKidObj = kids.find((k) => k.id === activeKid) || kids[0];
    return (
      <div style={{ padding: '14px 22px 140px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: tokens.sans, fontSize: 13, color: tokens.ink3, fontWeight: 500 }}>{greeting}</div>
          <div style={{ fontFamily: tokens.serif, fontSize: 22, fontWeight: 500, color: tokens.ink, marginTop: 2, letterSpacing: -0.2 }}>
            {activeKidObj
              ? <>What happened with <span style={{ fontStyle: 'italic', color: activeKidObj.color }}>{activeKidObj.name}</span>?</>
              : 'What happened?'}
          </div>
        </div>

        {kids.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontFamily: tokens.sans, fontSize: 11, fontWeight: 700,
              color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 16, height: 16, borderRadius: 16,
                background: tokens.ink, color: '#fff',
                fontFamily: tokens.sans, fontSize: 10, fontWeight: 700,
              }}>1</span>
              This moment is about
            </div>
            {kids.length <= 2 ? (
              <div style={{ display: 'flex', gap: 8 }}>
                {kids.map((k) => {
                  const active = k.id === activeKid;
                  return (
                    <button key={k.id} onClick={() => setActiveKid(k.id)} style={{
                      flex: 1, padding: '12px 14px', borderRadius: 16,
                      background: active ? tokens.surface : 'transparent',
                      border: `2px solid ${active ? k.color : tokens.line}`,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all .15s',
                    }}>
                      <Avatar kid={k} size={36}/>
                      <div style={{ textAlign: 'left', flex: 1 }}>
                        <div style={{ fontFamily: tokens.sans, fontSize: 14, fontWeight: 600, color: tokens.ink, lineHeight: 1.2 }}>{k.name}</div>
                        {!!k.age && <div style={{ fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3, marginTop: 1 }}>{k.age} years</div>}
                      </div>
                      {active && (
                        <div style={{
                          width: 18, height: 18, borderRadius: 18, background: k.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon.Check s={11} c="#fff"/>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{
                display: 'flex', gap: 12, overflowX: 'auto', overflowY: 'hidden',
                padding: '4px 2px 8px', margin: '0 -22px',
                paddingLeft: 22, paddingRight: 22,
                scrollbarWidth: 'none',
              }}>
                {kids.map((k) => {
                  const active = k.id === activeKid;
                  return (
                    <button key={k.id} onClick={() => setActiveKid(k.id)} style={{
                      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      flexShrink: 0, width: 62,
                    }}>
                      <div style={{
                        position: 'relative',
                        padding: active ? 2 : 0,
                        borderRadius: 60,
                        background: active ? k.color : 'transparent',
                        transition: 'all .15s',
                      }}>
                        <div style={{
                          padding: active ? 2 : 4,
                          borderRadius: 60,
                          background: tokens.bg,
                        }}>
                          <Avatar kid={k} size={active ? 48 : 44}/>
                        </div>
                        {active && (
                          <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 18, height: 18, borderRadius: 18, background: k.color,
                            border: `2px solid ${tokens.bg}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon.Check s={10} c="#fff"/>
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontFamily: tokens.sans, fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        color: active ? tokens.ink : tokens.ink2,
                        lineHeight: 1.2, marginTop: 2,
                      }}>{k.name}</div>
                      {!!k.age && (
                        <div style={{ fontFamily: tokens.sans, fontSize: 10, color: tokens.ink3, lineHeight: 1, marginTop: -2 }}>{k.age}y</div>
                      )}
                    </button>
                  );
                })}
                {onAddKid && (
                  <button onClick={onAddKid} style={{
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    flexShrink: 0, width: 62,
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 52, marginTop: 4,
                      border: `1.5px dashed ${tokens.line}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: tokens.ink3,
                    }}>
                      <Icon.Plus s={18} c={tokens.ink3}/>
                    </div>
                    <div style={{
                      fontFamily: tokens.sans, fontSize: 12, fontWeight: 500,
                      color: tokens.ink3, lineHeight: 1.2, marginTop: 2,
                    }}>Add</div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <Card style={{
          marginBottom: 'auto',
          background: stage === 'recording' ? tokens.primarySoft : tokens.surface,
          borderColor: stage === 'recording' ? 'transparent' : tokens.line,
          transition: 'all .3s',
        }}>
          <div style={{
            fontFamily: tokens.sans, fontSize: 11, fontWeight: 700,
            color: stage === 'recording' ? tokens.primaryInk : tokens.ink3,
            letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: 16,
              background: stage === 'recording' ? tokens.primary : tokens.ink,
              color: '#fff',
              fontFamily: tokens.sans, fontSize: 10, fontWeight: 700,
            }}>2</span>
            {stage === 'recording' ? 'Listening' : stage === 'transcribing' ? 'Transcribing…' : 'Hold to speak (or type below)'}
          </div>
          <div style={{ fontFamily: tokens.serif, fontSize: 19, lineHeight: 1.4, color: tokens.ink, letterSpacing: -0.1 }}>
            {stage === 'recording'
              ? 'Tell the whole story. Don’t edit.'
              : stage === 'transcribing'
                ? 'Turning your voice into words…'
                : 'Describe what just happened. Include what you did and how it ended.'}
          </div>
          <div style={{ marginTop: 14, height: 56 }}>
            <LiveWaveform active={stage === 'recording'} bars={32}/>
          </div>
          {stage === 'recording' && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 8, background: tokens.danger, animation: 'pg-pulse 1s infinite' }}/>
              <div style={{ fontFamily: tokens.mono, fontSize: 13, color: tokens.ink2, fontWeight: 500 }}>{fmt(elapsed)}</div>
            </div>
          )}
          {recError && (
            <div style={{ marginTop: 10, fontFamily: tokens.sans, fontSize: 12, color: tokens.danger }}>{recError}</div>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
          <MicButton
            recording={stage === 'recording'}
            onStart={handleMicStart}
            onStop={handleMicStop}
            size={156}
            disabled={kids.length === 0 || stage === 'transcribing'}
          />
          <div style={{ marginTop: 16, fontFamily: tokens.sans, fontSize: 13, color: tokens.ink3, fontWeight: 500 }}>
            {stage === 'recording' ? 'Release when done' : stage === 'transcribing' ? 'Working…' : 'Press and hold'}
          </div>
          <button onClick={() => setStage('recorded')} disabled={stage === 'transcribing'} style={{
            marginTop: 14, background: 'transparent', border: 'none', cursor: stage === 'transcribing' ? 'not-allowed' : 'pointer',
            fontFamily: tokens.sans, fontSize: 13, color: tokens.primary, fontWeight: 600,
            opacity: stage === 'transcribing' ? 0.5 : 1,
          }}>
            Or type it out
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'recorded') {
    return (
      <div style={{ padding: '14px 22px 140px' }}>
        <div style={{
          fontFamily: tokens.sans, fontSize: 12, fontWeight: 600,
          color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
        }}>Your story</div>
        <div style={{
          fontFamily: tokens.serif, fontSize: 26, lineHeight: 1.2, color: tokens.ink,
          letterSpacing: -0.3, marginBottom: 18,
        }}>Tell Kidsit AI what happened.</div>

        {recError && (
          <div style={{
            marginBottom: 12, padding: '10px 12px', borderRadius: 12,
            background: `${tokens.danger}14`, border: `1px solid ${tokens.danger}40`,
            fontFamily: tokens.sans, fontSize: 13, color: tokens.danger, lineHeight: 1.4,
          }}>{recError}</div>
        )}

        <textarea
          autoFocus value={story} onChange={(e) => setStory(e.target.value)}
          placeholder="She dropped to the ground in the park parking lot and started screaming. Everyone was looking. I tried asking her twice…"
          style={{
            width: '100%', minHeight: 180, padding: 16, borderRadius: 16,
            background: tokens.surface, border: `1px solid ${tokens.line}`,
            fontFamily: tokens.sans, fontSize: 15, color: tokens.ink, lineHeight: 1.5,
            resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <GhostButton onClick={() => { setStage('idle'); setElapsed(0); setStory(''); setRecError(''); }} style={{ flex: 1, justifyContent: 'center' }}>
            Start over
          </GhostButton>
          <PrimaryButton onClick={() => setStage('context')} disabled={!story.trim()} style={{ flex: 2 }}>
            Continue <Icon.ArrowRight s={16} c={story.trim() ? '#fff' : tokens.ink3}/>
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (stage === 'context') {
    const steps = [
      { key: 'location', q: 'Where did it happen?', options: LOCATIONS, render: (o, active, set) => (
        <Chip key={o.id} active={active} onClick={set} style={{ padding: '14px 18px', fontSize: 15 }}>
          {o.label} <span style={{ color: active ? 'rgba(255,255,255,0.7)' : tokens.ink3, fontSize: 12, marginLeft: 4 }}>{o.hint}</span>
        </Chip>
      )},
      { key: 'mood', q: 'How were they feeling?', options: MOODS, render: (o, active, set) => (
        <Chip key={o.id} active={active} onClick={set} style={{ padding: '14px 18px', fontSize: 15 }}>
          <span style={{ fontSize: 16, marginRight: 2 }}>{o.glyph}</span>{o.label}
        </Chip>
      )},
      { key: 'involved', q: 'Who else was there?', options: INVOLVED, render: (o, active, set) => (
        <Chip key={o.id} active={active} onClick={set} style={{ padding: '14px 18px', fontSize: 15 }}>{o.label}</Chip>
      )},
      { key: 'urgency', q: 'How urgent is this?', options: URGENCY, render: (o, active, set) => (
        <Chip key={o.id} active={active} onClick={set} dot={o.dot} style={{ padding: '14px 18px', fontSize: 15 }}>
          {o.label} <span style={{ color: active ? 'rgba(255,255,255,0.7)' : tokens.ink3, fontSize: 12, marginLeft: 4 }}>{o.desc}</span>
        </Chip>
      )},
    ];
    const s = steps[step];
    const val = ctx[s.key];
    const canNext = !!val;

    return (
      <div style={{ padding: '14px 22px 140px' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 3,
              background: i <= step ? tokens.primary : tokens.line, transition: 'all .3s',
            }}/>
          ))}
        </div>
        <div style={{
          fontFamily: tokens.sans, fontSize: 12, fontWeight: 600,
          color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
        }}>Step {step + 1} of {steps.length}</div>
        <div style={{
          fontFamily: tokens.serif, fontSize: 26, lineHeight: 1.2, color: tokens.ink,
          letterSpacing: -0.3, marginBottom: 22,
        }}>{s.q}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {s.options.map((o) => s.render(o, val === o.id, () => setCtx({ ...ctx, [s.key]: o.id })))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && <GhostButton onClick={() => setStep(step - 1)} style={{ justifyContent: 'center' }}><Icon.Back s={16}/></GhostButton>}
          <PrimaryButton
            disabled={!canNext}
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else onSubmit({ story, ctx });
            }}
            style={{ flex: 1 }}
          >
            {step < steps.length - 1 ? 'Next' : 'Get guidance'} <Icon.ArrowRight s={16} c={canNext ? '#fff' : tokens.ink3}/>
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return null;
}

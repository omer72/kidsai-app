import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { Avatar, Card, Segmented } from './primitives';
import { MOODS, LOCATIONS, SAMPLE_PATTERNS } from '../constants';

export function HistoryScreen({ kids, history, activeKid, onFeedback }) {
  const { t } = useTranslation();
  const RATINGS = [
    { id: 'worse', label: t('followup.rating.worse'), dot: '#D94A5C' },
    { id: 'same', label: t('followup.rating.same'), dot: '#9AA1AD' },
    { id: 'better', label: t('followup.rating.better'), dot: '#4AAE8C' },
    { id: 'great', label: t('followup.rating.great'), dot: '#2E5BFF' },
  ];
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const items = history.filter((h) => (filter === 'all' ? true : h.kidId === filter));
  const showPatterns = history.length >= 3;

  return (
    <div style={{ padding: '14px 20px 140px' }}>
      <div style={{
        fontFamily: tokens.serif, fontSize: 28, color: tokens.ink,
        letterSpacing: -0.3, fontWeight: 500, marginBottom: 14,
      }}>{t('history.title')}</div>

      {showPatterns && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: tokens.sans, fontSize: 11, fontWeight: 700,
            color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
          }}>{t('history.patternsHeader')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SAMPLE_PATTERNS.map((p, i) => (
              <Card key={i} pad={14} style={{ borderLeft: `3px solid ${tokens.primary}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon.TrendUp s={14} c={tokens.primary}/>
                  <div style={{ fontFamily: tokens.sans, fontSize: 14, fontWeight: 600, color: tokens.ink }}>{p.title}</div>
                  <div style={{
                    marginLeft: 'auto', fontFamily: tokens.mono, fontSize: 12,
                    color: tokens.primaryInk, background: tokens.primarySoft,
                    padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                  }}>×{p.count}</div>
                </div>
                <div style={{ fontFamily: tokens.sans, fontSize: 13, lineHeight: 1.45, color: tokens.ink2 }}>
                  {p.detail}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: t('history.filterAll') }, ...kids.map((k) => ({ value: k.id, label: k.name }))]}
        />
      </div>

      {items.length === 0 ? (
        <Card pad={20} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: tokens.serif, fontSize: 16, color: tokens.ink, marginBottom: 6 }}>
            {t('history.empty.title')}
          </div>
          <div style={{ fontFamily: tokens.sans, fontSize: 13, lineHeight: 1.5, color: tokens.ink2 }}>
            {t('history.empty.body')}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((h) => {
            const kid = kids.find((k) => k.id === h.kidId) || kids[0];
            const mood = MOODS.find((m) => m.id === h.mood);
            const location = LOCATIONS.find((l) => l.id === h.where);
            const open = openId === h.id;
            return (
              <Card key={h.id} pad={14}>
                <button onClick={() => setOpenId(open ? null : h.id)} style={{
                  display: 'flex', gap: 12, width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                }}>
                  <Avatar kid={kid} size={32}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <div style={{ fontFamily: tokens.sans, fontSize: 11, fontWeight: 600, color: tokens.ink3 }}>
                        {h.when || new Date(h.id).toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: tokens.sans, fontSize: 14.5, fontWeight: 600,
                      color: tokens.ink, marginBottom: 4, letterSpacing: -0.1,
                    }}>{h.title}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {h.where && (
                        <span style={{
                          fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3,
                          padding: '2px 7px', borderRadius: 4, background: tokens.surfaceAlt,
                        }}>{location ? t(location.labelKey) : h.where}</span>
                      )}
                      {mood && (
                        <span style={{
                          fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3,
                          padding: '2px 7px', borderRadius: 4, background: tokens.surfaceAlt,
                        }}>{mood.glyph} {t(mood.labelKey)}</span>
                      )}
                    </div>
                  </div>
                  <Icon.Chevron s={14} c={tokens.ink3} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}/>
                </button>

                {open && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${tokens.line}` }}>
                    {h.story && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: tokens.sans, fontSize: 10, fontWeight: 700, color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>{t('history.yourStoryLabel')}</div>
                        <div style={{ fontFamily: tokens.sans, fontSize: 13.5, lineHeight: 1.55, color: tokens.ink2 }}>{h.story}</div>
                      </div>
                    )}
                    {h.response?.summary && (
                      <div style={{
                        fontFamily: tokens.serif, fontSize: 16, lineHeight: 1.5, color: tokens.ink,
                        fontStyle: 'italic', marginBottom: 14,
                      }}>{h.response.summary}</div>
                    )}
                    {h.response?.sections?.map((s, si) => (
                      <div key={si} style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: tokens.sans, fontSize: 10, fontWeight: 700, color: tokens.primaryInk, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                        {s.body && (
                          <div style={{ fontFamily: tokens.sans, fontSize: 13.5, lineHeight: 1.55, color: tokens.ink }}>{s.body}</div>
                        )}
                        {Array.isArray(s.items) && s.items.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                            {s.items.map((it, ii) => (
                              <div key={ii} style={{ padding: '8px 10px', background: tokens.surfaceAlt, borderRadius: 10 }}>
                                <div style={{ fontFamily: tokens.sans, fontSize: 13, fontWeight: 600, color: tokens.ink, marginBottom: 2 }}>{it.h}</div>
                                <div style={{ fontFamily: tokens.sans, fontSize: 13, lineHeight: 1.45, color: tokens.ink2 }}>{it.b}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <div style={{ marginTop: 6, paddingTop: 14, borderTop: `1px solid ${tokens.line}` }}>
                      <div style={{ fontFamily: tokens.sans, fontSize: 10, fontWeight: 700, color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{t('history.feedbackPrompt')}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {RATINGS.map((r) => {
                          const active = h.feedback === r.id;
                          return (
                            <button key={r.id}
                              onClick={() => onFeedback?.(h.id, { feedback: active ? null : r.id })}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                                background: active ? tokens.ink : 'transparent',
                                border: `1px solid ${active ? tokens.ink : tokens.line}`,
                                fontFamily: tokens.sans, fontSize: 12, fontWeight: 500,
                                color: active ? '#fff' : tokens.ink,
                              }}>
                              <span style={{ width: 6, height: 6, borderRadius: 6, background: r.dot }}/>
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                      {h.note && (
                        <div style={{ marginTop: 10, padding: '8px 10px', background: tokens.surfaceAlt, borderRadius: 8, fontFamily: tokens.sans, fontSize: 12, lineHeight: 1.45, color: tokens.ink2, fontStyle: 'italic' }}>
                          "{h.note}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { Avatar, Card, Segmented } from './primitives';
import { MOODS, SAMPLE_PATTERNS } from '../constants';

export function HistoryScreen({ kids, history, activeKid }) {
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const items = history.filter((h) => (filter === 'all' ? true : h.kidId === filter));
  const showPatterns = history.length >= 3;

  return (
    <div style={{ padding: '14px 20px 140px' }}>
      <div style={{
        fontFamily: tokens.serif, fontSize: 28, color: tokens.ink,
        letterSpacing: -0.3, fontWeight: 500, marginBottom: 14,
      }}>History</div>

      {showPatterns && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: tokens.sans, fontSize: 11, fontWeight: 700,
            color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
          }}>Patterns this week</div>
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
          options={[{ value: 'all', label: 'All' }, ...kids.map((k) => ({ value: k.id, label: k.name }))]}
        />
      </div>

      {items.length === 0 ? (
        <Card pad={20} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: tokens.serif, fontSize: 16, color: tokens.ink, marginBottom: 6 }}>
            No moments logged yet
          </div>
          <div style={{ fontFamily: tokens.sans, fontSize: 13, lineHeight: 1.5, color: tokens.ink2 }}>
            Record your first moment from Home — it'll appear here.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((h) => {
            const kid = kids.find((k) => k.id === h.kidId) || kids[0];
            const mood = MOODS.find((m) => m.id === h.mood);
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
                        }}>{h.where}</span>
                      )}
                      {mood && (
                        <span style={{
                          fontFamily: tokens.sans, fontSize: 11, color: tokens.ink3,
                          padding: '2px 7px', borderRadius: 4, background: tokens.surfaceAlt,
                        }}>{mood.glyph} {mood.label}</span>
                      )}
                    </div>
                  </div>
                  <Icon.Chevron s={14} c={tokens.ink3} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}/>
                </button>

                {open && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${tokens.line}` }}>
                    {h.story && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: tokens.sans, fontSize: 10, fontWeight: 700, color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Your story</div>
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

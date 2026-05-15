import { tokens } from '../theme';
import { Icon } from './Icons';
import { Card, Label, Segmented } from './primitives';

export function SettingsScreen({ settings, setSettings, onClearData, billing, inTrial, onOpenSubscription, onOpenUpgrade }) {
  return (
    <div style={{ padding: '14px 20px 140px' }}>
      <div style={{
        fontFamily: tokens.serif, fontSize: 28, color: tokens.ink,
        letterSpacing: -0.3, fontWeight: 500, marginBottom: 14,
      }}>Settings</div>

      <Label>Subscription</Label>
      <div style={{ marginBottom: 18 }}>
        {billing?.entitled ? (
          <button onClick={onOpenSubscription} style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            background: tokens.surface, border: `1px solid ${tokens.line}`, textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: tokens.primarySoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Sparkle s={16} c={tokens.primary}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: tokens.sans, fontSize: 14, fontWeight: 600, color: tokens.ink, marginBottom: 2 }}>
                {inTrial ? 'Free trial active' : 'Active subscription'}
              </div>
              <div style={{ fontFamily: tokens.sans, fontSize: 12, color: tokens.ink3 }}>
                Manage plan, restore, or cancel
              </div>
            </div>
            <Icon.Chevron s={14} c={tokens.ink3}/>
          </button>
        ) : (
          <button onClick={onOpenUpgrade} style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            background: tokens.ink, color: '#fff', border: 'none', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Sparkle s={16} c="#fff"/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: tokens.sans, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Subscribe</div>
              <div style={{ fontFamily: tokens.sans, fontSize: 12, opacity: 0.7 }}>Unlock everything Kidsit AI can do</div>
            </div>
            <Icon.ArrowRight s={14} c="#fff"/>
          </button>
        )}
      </div>

      <Label>Theme</Label>
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={settings.theme}
          onChange={(v) => setSettings({ ...settings, theme: v })}
          options={[
            { value: 'warm', label: 'Warm' },
            { value: 'clinical', label: 'Clinical' },
            { value: 'dusk', label: 'Dusk' },
          ]}
        />
      </div>

      <Label>Flow style</Label>
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={settings.flow}
          onChange={(v) => setSettings({ ...settings, flow: v })}
          options={[
            { value: 'A', label: 'Guided' },
            { value: 'B', label: 'Dense' },
          ]}
        />
      </div>

      <Label>Data</Label>
      <Card pad={14}>
        <div style={{ fontFamily: tokens.sans, fontSize: 13, lineHeight: 1.5, color: tokens.ink2, marginBottom: 10 }}>
          All moments and kids are stored locally on this device. Clearing data is permanent.
        </div>
        <button onClick={onClearData} style={{
          padding: '12px 16px', borderRadius: 12, border: `1px solid ${tokens.line}`,
          background: 'transparent', color: tokens.danger,
          fontFamily: tokens.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%',
        }}>
          Clear all data
        </button>
      </Card>
    </div>
  );
}

import { tokens } from '../theme';
import { Card, Label, Segmented } from './primitives';

export function SettingsScreen({ settings, setSettings, onClearData }) {
  return (
    <div style={{ padding: '14px 20px 140px' }}>
      <div style={{
        fontFamily: tokens.serif, fontSize: 28, color: tokens.ink,
        letterSpacing: -0.3, fontWeight: 500, marginBottom: 14,
      }}>Settings</div>

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

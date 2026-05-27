import { useTranslation } from 'react-i18next';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { Card, Label, Segmented } from './primitives';
import { setLanguage, getLanguage } from '../i18n';

export function SettingsScreen({ settings, setSettings, onClearData, billing, inTrial, onOpenSubscription, onOpenUpgrade }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '14px 20px 140px' }}>
      <div style={{
        fontFamily: tokens.serif, fontSize: 28, color: tokens.ink,
        letterSpacing: -0.3, fontWeight: 500, marginBottom: 14,
      }}>{t('settings.title')}</div>

      <Label>{t('settings.subscriptionLabel')}</Label>
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
                {inTrial ? t('settings.freeTrialActive') : t('settings.activeSubscription')}
              </div>
              <div style={{ fontFamily: tokens.sans, fontSize: 12, color: tokens.ink3 }}>
                {t('settings.manageHint')}
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
              <div style={{ fontFamily: tokens.sans, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{t('settings.subscribe')}</div>
              <div style={{ fontFamily: tokens.sans, fontSize: 12, opacity: 0.7 }}>{t('settings.subscribeHint')}</div>
            </div>
            <Icon.ArrowRight s={14} c="#fff"/>
          </button>
        )}
      </div>

      <Label>{t('settings.themeLabel')}</Label>
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={settings.theme}
          onChange={(v) => setSettings({ ...settings, theme: v })}
          options={[
            { value: 'warm', label: t('settings.themeWarm') },
            { value: 'clinical', label: t('settings.themeClinical') },
            { value: 'dusk', label: t('settings.themeDusk') },
          ]}
        />
      </div>

      <Label>{t('settings.flowLabel')}</Label>
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={settings.flow}
          onChange={(v) => setSettings({ ...settings, flow: v })}
          options={[
            { value: 'A', label: t('settings.flowGuided') },
            { value: 'B', label: t('settings.flowDense') },
          ]}
        />
      </div>

      <Label>{t('settings.languageLabel')}</Label>
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={getLanguage()?.split('-')[0] || 'en'}
          onChange={(v) => setLanguage(v)}
          options={[
            { value: 'en', label: t('settings.languageEn') },
            { value: 'es', label: t('settings.languageEs') },
            { value: 'he', label: t('settings.languageHe') },
          ]}
        />
      </div>

      <Label>{t('aiConsent.settingsLabel')}</Label>
      <Card pad={14} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, ...tokens.type.bodySm, color: tokens.ink2 }}>
            {settings.aiConsent ? t('aiConsent.settingsHintEnabled') : t('aiConsent.settingsHintDisabled')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, alignSelf: 'center' }}>
            <button
              onClick={() => setSettings({ ...settings, aiConsent: !settings.aiConsent })}
              style={{
                width: 52, height: 32, borderRadius: 32, border: 'none',
                background: settings.aiConsent ? tokens.primary : tokens.surfaceAlt,
                position: 'relative', cursor: 'pointer',
                transition: 'background .15s',
                padding: 0,
              }}>
              <div style={{
                position: 'absolute', top: 4, left: settings.aiConsent ? 24 : 4,
                width: 24, height: 24, borderRadius: 24, background: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'left .15s',
              }}/>
            </button>
          </div>
        </div>
      </Card>

      <Label>{t('settings.dataLabel')}</Label>
      <Card pad={14}>
        <div style={{ ...tokens.type.bodySm, color: tokens.ink2, marginBottom: 12 }}>
          {t('settings.dataBody')}
        </div>
        <button onClick={onClearData} style={{
          padding: '12px 16px', borderRadius: 12, border: 'none',
          background: tokens.danger, color: '#fff',
          fontFamily: tokens.sans, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {t('settings.clearAll')}
        </button>
      </Card>

      <div style={{ marginTop: 18 }}><Label>{t('settings.aboutLabel')}</Label></div>
      <Card pad={16}>
        <div style={{ fontFamily: tokens.sans, fontSize: 13, lineHeight: 1.55, color: tokens.ink2 }}>
          <p style={{ margin: '0 0 10px' }}>
            <strong style={{ color: tokens.ink }}>{t('settings.aboutNotMedical')}</strong>{t('settings.aboutBody1')}
          </p>
          <p style={{ margin: '0 0 10px' }}>{t('settings.aboutBody2')}</p>
          <p style={{ margin: '0 0 10px' }}>{t('settings.aboutBody3')}</p>
          <p style={{ margin: 0, fontSize: 12, color: tokens.ink3 }}>
            <a href="https://kidsit.ai/terms" target="_blank" rel="noopener noreferrer" style={{ color: tokens.ink3, textDecoration: 'underline' }}>{t('common.terms')}</a>
            {' · '}
            <a href="https://kidsit.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ color: tokens.ink3, textDecoration: 'underline' }}>{t('common.privacy')}</a>
          </p>
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, fs } from '../theme';
import { Icon } from './Icons';
import { Card, Label, Segmented } from './primitives';
import { setLanguage, getLanguage } from '../i18n';
import { digestConfig, notificationBody } from '../digest';
import { syncDigestNotification } from '../notifications';
import { ShareExplainer } from './InsightsShare';

function Toggle({ on, label, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 52, height: 32, borderRadius: 32, border: 'none',
        background: on ? tokens.primary : tokens.surfaceAlt,
        position: 'relative', cursor: 'pointer', padding: 0, flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 4, insetInlineStart: on ? 24 : 4,
        width: 24, height: 24, borderRadius: 24, background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}/>
    </button>
  );
}

export function SettingsScreen({ settings, setSettings, onClearData, billing, inTrial, onOpenSubscription, onOpenUpgrade }) {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState('');
  const [explainOpen, setExplainOpen] = useState(false);
  const [notifNote, setNotifNote] = useState('');
  const digest = digestConfig(settings);

  const pushSchedule = (next, lang) => {
    const cfg = digestConfig(next);
    syncDigestNotification({
      enabled: cfg.enabled,
      cadence: cfg.cadence,
      weekday: cfg.weekday,
      hour: cfg.hour,
      body: notificationBody(cfg.cadence, lang || getLanguage()),
    }).then((result) => {
      setNotifNote(result?.reason === 'denied' ? t('settings.digestNotifDenied') : '');
    });
  };

  const setDigest = (patch) => {
    const next = { ...settings, digest: { ...digest, ...patch } };
    setSettings(next);
    if (next.digest.enabled || digest.enabled) pushSchedule(next);
  };
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return;
    import('@capacitor/app')
      .then(({ App }) => App.getInfo())
      .then((info) => setAppVersion(`${info.version} (${info.build})`))
      .catch(() => {});
  }, []);
  return (
    <div style={{ padding: '14px 20px 140px' }}>
      <div style={{
        fontFamily: tokens.serif, fontSize: fs(28), color: tokens.ink,
        letterSpacing: -0.3, fontWeight: 500, marginBottom: 14,
      }}>{t('settings.title')}</div>

      <Label>{t('settings.subscriptionLabel')}</Label>
      <div style={{ marginBottom: 18 }}>
        {billing?.entitled ? (
          <button onClick={onOpenSubscription} style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            background: tokens.surface, border: `1px solid ${tokens.line}`, textAlign: 'start',
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
              <div style={{ fontFamily: tokens.sans, fontSize: fs(14), fontWeight: 600, color: tokens.ink, marginBottom: 2 }}>
                {inTrial ? t('settings.freeTrialActive') : t('settings.activeSubscription')}
              </div>
              <div style={{ fontFamily: tokens.sans, fontSize: fs(12), color: tokens.ink3 }}>
                {t('settings.manageHint')}
              </div>
            </div>
            <Icon.Chevron s={14} c={tokens.ink3}/>
          </button>
        ) : (
          <button onClick={onOpenUpgrade} style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            background: tokens.ink, color: '#fff', border: 'none', textAlign: 'start',
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
              <div style={{ fontFamily: tokens.sans, fontSize: fs(14), fontWeight: 600, marginBottom: 2 }}>{t('settings.subscribe')}</div>
              <div style={{ fontFamily: tokens.sans, fontSize: fs(12), opacity: 0.7 }}>{t('settings.subscribeHint')}</div>
            </div>
            <Icon.ArrowRight s={14} c="#fff"/>
          </button>
        )}
      </div>

      <Label>{t('settings.fontSizeLabel')}</Label>
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={settings.fontSize || 'small'}
          onChange={(v) => setSettings({ ...settings, fontSize: v })}
          options={[
            { value: 'small', label: t('settings.fontSizeSmall') },
            { value: 'medium', label: t('settings.fontSizeMedium') },
            { value: 'large', label: t('settings.fontSizeLarge') },
          ]}
        />
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
          onChange={(v) => {
            setLanguage(v);
            if (digest.enabled) pushSchedule(settings, v);
          }}
          options={[
            { value: 'en', label: t('settings.languageEn') },
            { value: 'es', label: t('settings.languageEs') },
            { value: 'he', label: t('settings.languageHe') },
          ]}
        />
      </div>

      <Label>{t('settings.privacyLabel')}</Label>
      <Card pad={14} style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, ...tokens.type.bodySm, color: tokens.ink2 }}>
            <div style={{ fontWeight: 650, color: tokens.ink, marginBottom: 4 }}>{t('aiConsent.settingsLabel')}</div>
            {settings.aiConsent ? t('aiConsent.settingsHintEnabled') : t('aiConsent.settingsHintDisabled')}
          </div>
          <Toggle
            on={!!settings.aiConsent}
            label={t('aiConsent.settingsLabel')}
            onClick={() => setSettings({ ...settings, aiConsent: !settings.aiConsent })}
          />
        </div>
      </Card>
      <Card pad={14} style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, ...tokens.type.bodySm, color: tokens.ink2 }}>
            <div style={{ fontWeight: 650, color: tokens.ink, marginBottom: 4 }}>{t('settings.digestToggle')}</div>
            {digest.enabled ? t('settings.digestHintOn') : t('settings.digestHintOff')}
          </div>
          <Toggle
            on={digest.enabled}
            label={t('settings.digestToggle')}
            onClick={() => setDigest({ enabled: !digest.enabled })}
          />
        </div>
        {digest.enabled && (
          <div style={{ marginTop: 12 }}>
            <div style={{ ...tokens.type.bodySm, color: tokens.ink3, marginBottom: 6 }}>{t('settings.digestCadence')}</div>
            <Segmented
              value={digest.cadence}
              onChange={(cadence) => setDigest({ cadence })}
              options={[
                { value: 'week', label: t('settings.cadenceWeek') },
                { value: 'day', label: t('settings.cadenceDay') },
              ]}
            />
            {digest.cadence === 'week' && (
              <>
                <div style={{ ...tokens.type.bodySm, color: tokens.ink3, margin: '10px 0 6px' }}>{t('settings.digestDay')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDigest({ weekday: day })}
                      style={{
                        padding: '7px 10px', borderRadius: 999, cursor: 'pointer',
                        border: `1px solid ${digest.weekday === day ? tokens.ink : tokens.line}`,
                        background: digest.weekday === day ? tokens.ink : tokens.surface,
                        color: digest.weekday === day ? '#fff' : tokens.ink,
                        fontFamily: tokens.sans, fontSize: fs(12), fontWeight: 600,
                        maxWidth: '100%',
                      }}
                    >{t(`digest.day${day}`)}</button>
                  ))}
                </div>
              </>
            )}
            <div style={{ ...tokens.type.bodySm, color: tokens.ink3, margin: '10px 0 6px' }}>{t('settings.digestHour')}</div>
            <select
              aria-label={t('settings.digestHour')}
              value={digest.hour}
              onChange={(e) => setDigest({ hour: Number(e.target.value) })}
              style={{
                width: '100%', maxWidth: '100%', boxSizing: 'border-box',
                padding: '10px 12px', borderRadius: 12,
                border: `1px solid ${tokens.line}`, background: tokens.surface,
                color: tokens.ink, fontFamily: tokens.sans, fontSize: fs(14),
              }}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
              ))}
            </select>
            {notifNote && (
              <div style={{ ...tokens.type.bodySm, color: tokens.ink2, marginTop: 8 }}>{notifNote}</div>
            )}
          </div>
        )}
      </Card>
      <Card pad={14} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, ...tokens.type.bodySm, color: tokens.ink2 }}>
            <div style={{ fontWeight: 650, color: tokens.ink, marginBottom: 4 }}>{t('settings.shareToggle')}</div>
            {settings.shareInsights ? t('settings.shareHintOn') : t('settings.shareHintOff')}
            {!digest.enabled && (
              <div style={{ marginTop: 6 }}>{t('settings.shareNeedsDigest')}</div>
            )}
          </div>
          <Toggle
            on={!!settings.shareInsights}
            label={t('settings.shareToggle')}
            onClick={() => {
              if (settings.shareInsights) setSettings({ ...settings, shareInsights: false });
              else setExplainOpen(true);
            }}
          />
        </div>
      </Card>
      <ShareExplainer
        open={explainOpen}
        onCancel={() => setExplainOpen(false)}
        onConfirm={() => {
          setExplainOpen(false);
          setSettings({ ...settings, shareInsights: true });
        }}
      />

      <Label>{t('settings.dataLabel')}</Label>
      <Card pad={14}>
        <div style={{ ...tokens.type.bodySm, color: tokens.ink2, marginBottom: 12 }}>
          {t('settings.dataBody')}
        </div>
        <button onClick={onClearData} style={{
          padding: '12px 16px', borderRadius: 12, border: 'none',
          background: tokens.danger, color: '#fff',
          fontFamily: tokens.sans, fontSize: fs(14), fontWeight: 600,
          cursor: 'pointer', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {t('settings.clearAll')}
        </button>
      </Card>

      <div style={{ marginTop: 18 }}><Label>{t('settings.aboutLabel')}</Label></div>
      <Card pad={16}>
        <div style={{ fontFamily: tokens.sans, fontSize: fs(13), lineHeight: 1.55, color: tokens.ink2 }}>
          <p style={{ margin: '0 0 10px' }}>
            <strong style={{ color: tokens.ink }}>{t('settings.aboutNotMedical')}</strong>{t('settings.aboutBody1')}
          </p>
          <p style={{ margin: '0 0 10px' }}>{t('settings.aboutBody2')}</p>
          <p style={{ margin: '0 0 10px' }}>{t('settings.aboutBody3')}</p>
          <p style={{ margin: 0, fontSize: fs(12), color: tokens.ink3 }}>
            <a href="https://kidsit.ai/terms" target="_blank" rel="noopener noreferrer" style={{ color: tokens.ink3, textDecoration: 'underline' }}>{t('common.terms')}</a>
            {' · '}
            <a href="https://kidsit.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ color: tokens.ink3, textDecoration: 'underline' }}>{t('common.privacy')}</a>
          </p>
        </div>
      </Card>

      {appVersion && (
        <div style={{
          marginTop: 16, textAlign: 'center',
          fontFamily: tokens.sans, fontSize: fs(12), color: tokens.ink3,
        }}>
          {t('settings.version', { version: appVersion })}
        </div>
      )}
    </div>
  );
}

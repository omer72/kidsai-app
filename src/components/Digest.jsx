import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, fs } from '../theme';
import { Chip } from './primitives';
import { SITUATIONS } from '../taxonomy';
import {
  aggregateDigest,
  digestConfig,
  hasSentPeriod,
  renderMomentCount,
  renderPoint,
  sentKey,
  situationLabel,
} from '../digest';
import { InsightsShare, ShareExplainer, EqualActions } from './InsightsShare';

export function SituationPicker({ value, onChange, label }) {
  const { i18n } = useTranslation();
  return (
    <div style={{ maxWidth: '100%' }}>
      {label && (
        <div style={{ ...tokens.type.label, color: tokens.ink3, marginBottom: 8 }}>{label}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SITUATIONS.filter((item) => item.id !== 'unclassified').map((item) => (
          <Chip
            key={item.id}
            dense
            active={value === item.id}
            onClick={() => onChange(item.id)}
            style={{ maxWidth: '100%', whiteSpace: 'normal', textAlign: 'start' }}
          >
            {situationLabel(item.id, i18n.language)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function DigestBanner({ kidName, cadence, empty, isNew, onOpen }) {
  const { t } = useTranslation();
  const title = cadence === 'day'
    ? t('digest.bannerTitleDay', { name: kidName })
    : t('digest.bannerTitleWeek', { name: kidName });
  return (
    <button
      type="button"
      data-digest-banner
      onClick={onOpen}
      style={{
        width: '100%', maxWidth: '100%', textAlign: 'start', cursor: 'pointer',
        background: tokens.surface, border: `1px solid ${tokens.line}`,
        borderRadius: 16, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{
          ...tokens.type.bodyLg, fontWeight: 650, color: tokens.ink,
          minWidth: 0, overflowWrap: 'anywhere',
        }}>{title}</div>
        {isNew && (
          <span style={{
            flexShrink: 0, fontFamily: tokens.sans, fontSize: fs(11), fontWeight: 700,
            color: tokens.primaryInk, background: tokens.primarySoft,
            borderRadius: 999, padding: '2px 8px',
          }}>{t('digest.new')}</span>
        )}
      </div>
      <div style={{ ...tokens.type.bodySm, color: tokens.ink2, overflowWrap: 'anywhere' }}>
        {empty ? t('digest.bannerEmpty') : t('digest.bannerBody')}
      </div>
    </button>
  );
}

export function DigestScreen({
  kid, kids, history, settings, setSettings, digestMeta, setDigestMeta, onBack,
}) {
  const { t, i18n } = useTranslation();
  const cfg = digestConfig(settings);
  const now = useState(() => new Date())[0];
  const aggregate = aggregateDigest(history, { kidId: kid.id, cadence: cfg.cadence, now });
  const [shareOpen, setShareOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const sent = hasSentPeriod(digestMeta, kid.id, aggregate.periodKey);
  const showNudge = !settings.shareInsights && !digestMeta.sharePrompted && (digestMeta.digestsOpened || 0) >= 3;
  const title = cfg.cadence === 'day'
    ? t('digest.titleDay', { name: kid.name })
    : t('digest.titleWeek', { name: kid.name });
  const types = Object.keys(aggregate.situations).sort((a, b) => {
    if (a === 'unclassified') return 1;
    if (b === 'unclassified') return -1;
    return a.localeCompare(b);
  });
  const unclassified = aggregate.situations.unclassified;
  const unclassifiedCount = unclassified
    ? unclassified.great + unclassified.better + unclassified.same + unclassified.worse + unclassified.unrated
    : 0;

  return (
    <div style={{ padding: '8px 20px 140px', maxWidth: '100%', overflowX: 'hidden' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'transparent', border: 'none', padding: '4px 0 10px', cursor: 'pointer',
          fontFamily: tokens.sans, fontSize: fs(14), fontWeight: 600, color: tokens.ink2,
        }}
      >{t('digest.back')}</button>
      <div style={{ ...tokens.type.h2, fontSize: fs(26), color: tokens.ink, marginBottom: 6, overflowWrap: 'anywhere' }}>
        {title}
      </div>
      <div style={{ ...tokens.type.bodySm, color: tokens.ink3, marginBottom: 14 }}>
        {renderMomentCount(aggregate.total, i18n.language)} · {t('digest.onDevice')}
      </div>

      {aggregate.total === 0 ? (
        <div style={{
          background: tokens.surface, border: `1px solid ${tokens.line}`,
          borderRadius: 16, padding: 16, marginBottom: 14,
        }}>
          <div style={{ ...tokens.type.h3, color: tokens.ink, marginBottom: 6 }}>{t('digest.emptyTitle')}</div>
          <div style={{ ...tokens.type.bodySm, color: tokens.ink2 }}>{t('digest.emptyBody', { name: kid.name })}</div>
        </div>
      ) : (
        <>
          {aggregate.total === 1 && (
            <div style={{ ...tokens.type.bodySm, color: tokens.ink2, marginBottom: 12 }}>{t('digest.oneMoment')}</div>
          )}
          <div style={{ ...tokens.type.label, color: tokens.ink3, marginBottom: 8 }}>{t('digest.whatHappened')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {types.map((type) => {
              const row = aggregate.situations[type];
              const worked = row.better + row.great;
              const notWorked = row.same + row.worse;
              return (
                <div key={type} style={{
                  background: tokens.surface, border: `1px solid ${tokens.line}`,
                  borderRadius: 14, padding: '10px 12px', maxWidth: '100%',
                }}>
                  <div style={{ ...tokens.type.body, fontWeight: 650, color: tokens.ink, marginBottom: 4 }}>
                    {situationLabel(type, i18n.language)}
                  </div>
                  <div style={{ ...tokens.type.bodySm, color: tokens.ink2, overflowWrap: 'anywhere' }}>
                    {t('digest.helpedLine', { worked, notWorked, unrated: row.unrated })}
                  </div>
                </div>
              );
            })}
          </div>
          {unclassifiedCount > 0 && (
            <div style={{ ...tokens.type.bodySm, color: tokens.ink3, marginBottom: 14 }}>
              {t('digest.unclassifiedNote', { count: unclassifiedCount })}
            </div>
          )}
          <div style={{ ...tokens.type.label, color: tokens.ink3, marginBottom: 8 }}>{t('digest.whyTitle')}</div>
          {aggregate.points.length === 0 ? (
            <div style={{ ...tokens.type.bodySm, color: tokens.ink2, marginBottom: 16 }}>{t('digest.whyEmpty')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {aggregate.points.map((point, index) => (
                <div key={`${point.kind}-${index}`} dir="auto" style={{
                  ...tokens.type.body, color: tokens.ink,
                  background: tokens.primarySoft, borderRadius: 14, padding: '10px 12px',
                  overflowWrap: 'anywhere',
                }}>
                  {renderPoint(point, i18n.language)}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showNudge && (
        <div style={{
          border: `1px solid ${tokens.line}`, borderRadius: 16, padding: 14, marginBottom: 14,
          background: tokens.surface, maxWidth: '100%',
        }}>
          <div style={{ ...tokens.type.body, fontWeight: 650, color: tokens.ink, marginBottom: 6 }}>{t('insights.nudgeTitle')}</div>
          <div style={{ ...tokens.type.bodySm, color: tokens.ink2, marginBottom: 12 }}>{t('insights.nudgeBody')}</div>
          <EqualActions
            startLabel={t('insights.notNow')}
            endLabel={t('insights.turnOn')}
            onStart={() => setDigestMeta({ ...digestMeta, sharePrompted: true })}
            onEnd={() => setExplainOpen(true)}
          />
        </div>
      )}

      {settings.shareInsights && (
        sent ? (
          <div style={{ ...tokens.type.bodySm, color: tokens.ink2 }}>{t('insights.alreadySent')}</div>
        ) : (
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              border: `1px solid ${tokens.line}`, background: tokens.surface,
              color: tokens.ink, fontFamily: tokens.sans, fontSize: fs(14), fontWeight: 600,
              cursor: 'pointer',
            }}
          >{t('insights.send')}</button>
        )
      )}

      <ShareExplainer
        open={explainOpen}
        onCancel={() => {
          setExplainOpen(false);
          setDigestMeta({ ...digestMeta, sharePrompted: true });
        }}
        onConfirm={() => {
          setExplainOpen(false);
          setSettings({ ...settings, shareInsights: true });
          setDigestMeta({ ...digestMeta, sharePrompted: true });
        }}
      />
      <InsightsShare
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        history={history}
        kid={kid}
        kids={kids}
        cadence={cfg.cadence}
        now={now}
        onSent={(periodKey) => {
          const key = sentKey(kid.id, periodKey);
          if (digestMeta.sentPeriods?.includes(key)) return;
          setDigestMeta({
            ...digestMeta,
            sentPeriods: [...(digestMeta.sentPeriods || []), key],
          });
        }}
      />
    </div>
  );
}

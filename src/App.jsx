import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { applyTheme, applyFontSize, tokens, fs } from './theme';
import { loadSettings, saveSettings, loadKids, saveKids, loadHistory, appendHistory, updateHistoryEntry, clearAll, loadDigestMeta, saveDigestMeta } from './storage';
import { AccessError, getGuidance, hasApiKey } from './openai';
import { normalizeGuidance } from './taxonomy';
import { aggregateDigest, digestConfig, noteDigestOpened } from './digest';
import { cancelDigestNotification } from './notifications';
import { initBilling, offUpdate, refreshEntitlement, billingAvailable } from './billing';
import { InAppReview } from '@capacitor-community/in-app-review';
import { demoResponse } from './constants';
import { Icon } from './components/Icons';
import { IOSDevice } from './components/IOSFrame';
import { TabBar, ConfirmDialog } from './components/primitives';
import { WelcomeScreen } from './components/Welcome';
import { OnboardingScreen } from './components/Onboarding';
import { PaywallScreen } from './components/Paywall';
import { FlowA } from './components/FlowA';
import { FlowB } from './components/FlowB';
import { ThinkingScreen } from './components/Thinking';
import { ResponseScreen } from './components/Response';
import { FollowupScreen } from './components/Followup';
import { HistoryScreen } from './components/History';
import { KidsScreen } from './components/Kids';
import { SettingsScreen } from './components/Settings';
import { SubscriptionScreen } from './components/TrialScreens';
import { AIConsentModal } from './components/AIConsent';
import { DigestBanner, DigestScreen } from './components/Digest';

import { INSET_TOP_MIN } from './platform';
import { useHardwareBack } from './backbutton';
import { flushFunnel, initFunnel, markFunnel, setFunnelContext } from './funnel';

// Positive closes (Helped / Really helped) before the store review prompt.
const REVIEW_AFTER_POSITIVE = 1;

const FRAME_W = 402;
const FRAME_H = 874;

function readViewport() {
  if (typeof window === 'undefined') return { w: FRAME_W, h: FRAME_H, fullscreen: false, scale: 1 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const native = window.Capacitor && (window.Capacitor.isNativePlatform?.() || window.Capacitor.isNative);
  const narrow = w < 500;
  const short = h < 700;
  const fullscreen = !!(native || narrow || short);
  const scale = fullscreen ? 1 : Math.min(1, (h - 40) / FRAME_H, (w - 40) / FRAME_W);
  return { w, h, fullscreen, scale };
}

function useViewport() {
  const [v, setV] = useState(readViewport);
  useEffect(() => {
    const onResize = () => setV(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return v;
}

function MainApp({ settings, setSettings, kids, setKids, history, setHistory, setEntryFeedback, onClearData, fullscreen, billing, onBillingChange, digestMeta, setDigestMeta }) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState(() => (kids.length === 0 ? 'kids' : 'home'));
  const [activeKidId, setActiveKidId] = useState(kids[0]?.id || null);
  const [flowState, setFlowState] = useState({ stage: 'compose', story: '', ctx: null, response: null, error: null });
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallNotice, setPaywallNotice] = useState(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [firstKidPending, setFirstKidPending] = useState(false); // intake open for a just-added first kid
  const [consentRequest, setConsentRequest] = useState(null); // resolver for an in-flight consent ask
  const [digestOpen, setDigestOpen] = useState(false);

  const entitled = !!billing?.entitled;
  const inTrial = !!billing?.inTrial;
  const visibleKids = useMemo(() => (entitled ? kids : kids.slice(0, 1)), [kids, entitled]);
  const lockedKidCount = kids.length - visibleKids.length;

  useEffect(() => {
    if (!entitled && activeKidId && !visibleKids.find((k) => k.id === activeKidId)) {
      setActiveKidId(visibleKids[0]?.id || null);
    }
  }, [entitled, activeKidId, visibleKids]);

  const activeKid = useMemo(() => visibleKids.find((k) => k.id === activeKidId) || visibleKids[0], [visibleKids, activeKidId]);
  const FlowComponent = settings.flow === 'B' ? FlowB : FlowA;

  // Apple Review 5.1.2(i) — require explicit consent before any data leaves
  // the device for OpenAI. Resolves true once the user has agreed (now or
  // previously), false if they decline. Flows call this before recording so
  // voice never reaches transcription without consent; submit re-checks as a
  // backstop (typed-only path, or consent revoked in Settings).
  const ensureConsent = () => {
    if (settings.aiConsent) return Promise.resolve(true);
    return new Promise((resolve) => setConsentRequest({ resolve }));
  };

  // Free answers left, as last reported by the server. Null when unknown
  // (subscriber, first run, or the server gate is not enforced).
  const freeRemaining = typeof settings.freeRemaining === 'number' ? settings.freeRemaining : null;

  const openPaywall = (source) => {
    setPaywallNotice(source === 'free_limit' ? 'freeLimit' : null);
    setPaywallOpen(true);
    markFunnel('paywall_shown');
  };
  const closePaywall = () => {
    setPaywallOpen(false);
    markFunnel('paywall_dismissed');
  };

  // Free answers used up: open the paywall before the parent records or
  // types a story the server would turn away.
  const ensureAccess = () => {
    if (entitled || freeRemaining !== 0) return true;
    openPaywall('free_limit');
    return false;
  };

  // The server said "subscription required" (403).
  const accessDenied = () => {
    if (freeRemaining !== 0) setSettings((prev) => ({ ...prev, freeRemaining: 0 }));
    openPaywall('free_limit');
  };

  const submit = async ({ story, ctx }) => {
    if (!ensureAccess()) return;
    if (!(await ensureConsent())) return;
    setFlowState({ stage: 'thinking', story, ctx, response: null, error: null });
    markFunnel('moment_sent');
    try {
      let response;
      if (hasApiKey()) {
        const result = await getGuidance({ story, ctx, kid: activeKid, history });
        response = normalizeGuidance(result.guidance);
        if (result.freeRemaining !== freeRemaining) {
          setSettings((prev) => ({ ...prev, freeRemaining: result.freeRemaining }));
        }
      } else {
        await new Promise((r) => setTimeout(r, 1800));
        response = normalizeGuidance(demoResponse(i18n.language));
      }
      markFunnel('answer_received');
      setFlowState((s) => ({ ...s, stage: 'response', response }));
    } catch (err) {
      if (err instanceof AccessError) {
        // Subscription required: not an error to show. Back to compose, with
        // the paywall on top.
        setFlowState({ stage: 'compose', story: '', ctx: null, response: null, error: null });
        accessDenied();
        return;
      }
      console.error('OpenAI error:', err);
      setFlowState((s) => ({ ...s, stage: 'response', error: err.message || 'Something went wrong' }));
    }
  };

  // Hardware back: overlays close first, then the flow unwinds, then any
  // non-home tab returns home. Unhandled presses minimize the app (backbutton.js).
  useHardwareBack(() => {
    if (consentRequest) { consentRequest.resolve(false); setConsentRequest(null); return true; }
    if (paywallOpen) { closePaywall(); return true; }
    if (subscriptionOpen) { setSubscriptionOpen(false); return true; }
    if (digestOpen) { setDigestOpen(false); return true; }
    return false;
  }, 100);
  useHardwareBack(() => {
    if (tab !== 'home') { setTab('home'); return true; }
    if (flowState.stage === 'response' || flowState.stage === 'followup') { closeMoment(); return true; }
    if (flowState.stage === 'thinking') return true; // let it finish
    return false;
  }, 40);

  const closeMoment = (feedback = null) => {
    if (flowState.response && !flowState.error) {
      const response = normalizeGuidance(flowState.response);
      const entry = {
        kidId: activeKid?.id,
        title: response.title || 'Moment',
        story: flowState.story,
        where: flowState.ctx?.location,
        mood: flowState.ctx?.mood,
        involved: flowState.ctx?.involved || null,
        urgency: flowState.ctx?.urgency || null,
        situation: response.situation || 'other',
        response,
        when: new Date().toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
        feedback: feedback?.rating || null,
        note: feedback?.note || null,
      };
      setHistory(appendHistory(entry));
      // Only Helped / Really helped count. Close-for-now and the hardware
      // back button pass no rating, so they do not count. A didn't-help
      // rating (worse / same) does not count and does not reset the total:
      // the prompt follows REVIEW_AFTER_POSITIVE positive saves, not a streak.
      // One shot, no retry.
      const rating = typeof feedback?.rating === 'string' ? feedback.rating : null;
      if (rating) markFunnel('moment_rated');
      const positive = rating === 'better' || rating === 'great';
      const reviewUses = (settings.reviewUses || 0) + (positive ? 1 : 0);
      const native = !!(window.Capacitor?.isNativePlatform?.());
      // The first paywall now comes after the first finished moment, not
      // before the app has shown anything. Once per install, never for a
      // subscriber, and never stacked on the review prompt: when both are
      // due the paywall goes first and the review waits for a later save.
      const showIntroPaywall = !entitled && !settings.introPaywallShown;
      const shouldAsk = positive && reviewUses >= REVIEW_AFTER_POSITIVE && !settings.askedForReview && native && !showIntroPaywall;
      if (reviewUses !== (settings.reviewUses || 0) || shouldAsk || showIntroPaywall) {
        setSettings((prev) => ({
          ...prev,
          reviewUses,
          askedForReview: prev.askedForReview || shouldAsk,
          introPaywallShown: prev.introPaywallShown || showIntroPaywall,
        }));
      }
      if (shouldAsk) InAppReview.requestReview().catch(() => {});
      if (showIntroPaywall) openPaywall('first_moment');
    }
    setFlowState({ stage: 'compose', story: '', ctx: null, response: null, error: null });
  };


  const goFollowup = () => setFlowState((s) => ({ ...s, stage: 'followup' }));

  let content;
  if (tab === 'home') {
    if (flowState.stage === 'thinking') {
      content = <ThinkingScreen/>;
    } else if (flowState.stage === 'response') {
      content = (
        <ResponseScreen
          response={flowState.response}
          error={flowState.error}
          kid={activeKid}
          onFollowup={goFollowup}
          onDone={closeMoment}
          onSituation={(situation) => setFlowState((s) => ({
            ...s,
            response: s.response ? { ...s.response, situation } : s.response,
          }))}
        />
      );
    } else if (flowState.stage === 'followup') {
      content = <FollowupScreen kid={activeKid} onDone={closeMoment}/>;
    } else if (digestOpen && activeKid) {
      content = (
        <DigestScreen
          kid={activeKid}
          kids={kids}
          history={history}
          settings={settings}
          setSettings={setSettings}
          digestMeta={digestMeta}
          setDigestMeta={setDigestMeta}
          onBack={() => setDigestOpen(false)}
        />
      );
    } else {
      const digest = digestConfig(settings);
      const digestAgg = activeKid
        ? aggregateDigest(history, { kidId: activeKid.id, cadence: digest.cadence })
        : null;
      content = (
        <>
          {digest.enabled && activeKid && digestAgg && (
            <div style={{ padding: '8px 20px 0', maxWidth: '100%' }}>
              <DigestBanner
                kidName={activeKid.name}
                cadence={digest.cadence}
                empty={digestAgg.total === 0}
                isNew={digestMeta.lastShownPeriod?.[activeKid.id] !== digestAgg.windowKey}
                onOpen={() => {
                  const noted = noteDigestOpened(digestMeta, activeKid.id, digestAgg.windowKey);
                  if (noted.openedNew) setDigestMeta(noted.meta);
                  setDigestOpen(true);
                }}
              />
            </div>
          )}
          {!entitled && freeRemaining !== null && freeRemaining > 0 && (
            <div data-free-left style={{
              padding: '8px 20px 0', textAlign: 'center',
              fontFamily: tokens.sans, fontSize: fs(12), color: tokens.ink3,
            }}>{t('free.left', { count: freeRemaining })}</div>
          )}
          <FlowComponent
          key={settings.flow}
          kids={visibleKids}
          activeKid={activeKidId}
          setActiveKid={setActiveKidId}
          onSubmit={submit}
          onAddKid={() => setTab('kids')}
          ensureConsent={ensureConsent}
          ensureAccess={ensureAccess}
          onAccessDenied={accessDenied}
        />
        </>
      );
    }
  } else if (tab === 'history') {
    content = <HistoryScreen kids={visibleKids} history={history} activeKid={activeKidId} onFeedback={setEntryFeedback}/>;
  } else if (tab === 'kids') {
    // Adding the very first kid lands the user on the compose screen so the
    // path to a first conversation is obvious (they start on this tab) — but
    // only once the intake questionnaire that opens right after is closed.
    const setKidsAndMaybeStart = (next) => {
      const firstKidAdded = kids.length === 0 && next.length > 0;
      setKids(next);
      if (firstKidAdded) {
        markFunnel('child_added');
        setActiveKidId(next[0].id);
        setFirstKidPending(true);
      }
    };
    content = (
      <KidsScreen
        kids={kids} setKids={setKidsAndMaybeStart}
        activeKid={activeKidId} setActiveKid={setActiveKidId}
        history={history}
        entitled={entitled}
        lockedKidCount={lockedKidCount}
        onIntakeClose={() => { if (firstKidPending) { setFirstKidPending(false); setTab('home'); } }}
        onRequestUpgrade={() => openPaywall('add_child')}
      />
    );
  } else {
    if (subscriptionOpen && billing?.entitled) {
      content = (
        <div style={{ padding: '0 0 140px' }}>
          <SubscriptionScreen
            billing={billing}
            fullscreen={fullscreen}
            onBack={() => setSubscriptionOpen(false)}
            onChanged={onBillingChange}
          />
        </div>
      );
    } else {
      content = (
        <SettingsScreen
          settings={settings} setSettings={setSettings} onClearData={onClearData}
          billing={billing} inTrial={inTrial}
          onOpenSubscription={() => setSubscriptionOpen(true)}
          onOpenUpgrade={() => openPaywall('settings')}
        />
      );
    }
  }

  const topBar = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: fullscreen
        ? `max(${INSET_TOP_MIN}px, calc(env(safe-area-inset-top, 0px) + 36px), calc(var(--shot-sat, 0px) + 36px)) 20px 8px`
        : '58px 20px 8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `radial-gradient(circle at 30% 30%, ${tokens.primary} 0%, ${tokens.primaryInk} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 10px ${tokens.primary}40`,
        }}><Icon.Sparkle s={14} c="#fff"/></div>
        <div style={{ fontFamily: tokens.serif, fontSize: fs(19), fontWeight: 600, color: tokens.ink, letterSpacing: -0.3 }}>{t('brand.wordmark')}</div>
      </div>
    </div>
  );

  return (
    <div style={{
      width: '100%', height: '100%', background: tokens.bg,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      fontFamily: tokens.sans, color: tokens.ink,
    }}>
      {topBar}
      <div data-kb-scroll style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{content}</div>
      <TabBar current={tab} onChange={(next) => { setDigestOpen(false); setTab(next); }}/>
      {paywallOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: tokens.bg }}>
          <PaywallScreen
            fullscreen={fullscreen}
            notice={paywallNotice ? t(`paywall.notice.${paywallNotice}`) : null}
            onClose={closePaywall}
            onStart={closePaywall}
            onPurchased={(next) => { markFunnel('purchase'); onBillingChange(next); setPaywallOpen(false); }}
          />
        </div>
      )}
      {consentRequest && (
        <AIConsentModal
          fullscreen={fullscreen}
          onAgree={() => {
            setSettings({ ...settings, aiConsent: true });
            consentRequest.resolve(true);
            setConsentRequest(null);
          }}
          onDecline={() => {
            consentRequest.resolve(false);
            setConsentRequest(null);
          }}
        />
      )}
    </div>
  );
}

export function App() {
  const [settings, setSettingsState] = useState(() => loadSettings());
  const [kids, setKidsState] = useState(() => loadKids());
  const [history, setHistory] = useState(() => loadHistory());
  const [digestMeta, setDigestMetaState] = useState(() => loadDigestMeta());
  const [phase, setPhase] = useState(settings.onboarded ? 'app' : 'welcome');
  const [billing, setBilling] = useState(() => settings.billing || { entitled: false });

  // Funnel counts start with installs that onboard on this version. An
  // install that was already past onboarding would report later steps without
  // the earlier ones, so it reports nothing.
  useState(() => initFunnel({ existingInstall: !!settings.onboarded }));

  applyTheme(settings.theme);
  applyFontSize(settings.fontSize);

  const { fullscreen, scale } = useViewport();

  // Accepts a value or an updater. Use the updater after an await, where the
  // `settings` captured by the closure may already be stale.
  const setSettings = (next) => {
    setSettingsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      saveSettings(value);
      return value;
    });
  };

  const applyBilling = useCallback((next) => {
    setBilling(next);
    setSettingsState((s) => {
      const merged = { ...s, billing: { ...next, syncedAt: Date.now() } };
      saveSettings(merged);
      return merged;
    });
  }, []);

  useEffect(() => {
    if (!billingAvailable()) return;
    let mounted = true;
    initBilling((next) => { if (mounted) applyBilling(next); })
      .then((next) => { if (mounted) applyBilling(next); })
      .catch((err) => console.warn('billing init failed:', err));
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refreshEntitlement().then((next) => mounted && applyBilling(next)).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisible);
      offUpdate(applyBilling);
    };
  }, [applyBilling]);
  const setDigestMeta = (next) => {
    setDigestMetaState(next);
    saveDigestMeta(next);
  };
  const setKids = (next) => {
    setKidsState(next);
    saveKids(next);
  };
  const setEntryFeedback = (id, patch) => setHistory(updateHistoryEntry(id, patch));
  const { t: tApp, i18n: i18nApp } = useTranslation();
  useEffect(() => {
    setFunnelContext({ lang: i18nApp.language });
    flushFunnel().catch(() => {});
  }, [i18nApp.language]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const onClearData = () => setClearConfirmOpen(true);
  const confirmClearData = () => {
    setClearConfirmOpen(false);
    clearAll();
    cancelDigestNotification();
    const fresh = loadSettings();
    setSettingsState(fresh);
    setKidsState(loadKids());
    setHistory(loadHistory());
    setDigestMetaState(loadDigestMeta());
    setPhase('welcome');
  };

  useHardwareBack(() => {
    if (clearConfirmOpen) { setClearConfirmOpen(false); return true; }
    if (phase === 'onboarding') { setPhase('welcome'); return true; }
    if (phase === 'consent') { finishOnboarding(); return true; } // same as "not now"
    return false;
  }, 80);

  const finishOnboarding = (patch = {}) => {
    setSettings((prev) => ({ ...prev, ...patch, onboarded: true }));
    setPhase('app');
    markFunnel('onboarding_done');
  };

  let inner;
  if (phase === 'welcome') {
    inner = (
      <WelcomeScreen
        onStart={() => setPhase('onboarding')}
        onRestored={(next) => { applyBilling(next); finishOnboarding(); }}
        fullscreen={fullscreen}
      />
    );
  } else if (phase === 'onboarding') {
    // No paywall here: the first one comes after the first finished moment
    // (closeMoment in MainApp), once the parent has seen a real answer.
    inner = <OnboardingScreen onDone={() => (settings.aiConsent ? finishOnboarding() : setPhase('consent'))} fullscreen={fullscreen}/>;
  } else if (phase === 'consent') {
    inner = (
      <AIConsentModal
        fullscreen={fullscreen}
        onAgree={() => finishOnboarding({ aiConsent: true })}
        // "Not now" shouldn't dead-end onboarding — continue without consent;
        // the first AI-touching action re-asks via ensureConsent.
        onDecline={() => finishOnboarding()}
      />
    );
  } else {
    inner = (
      <MainApp
        settings={settings} setSettings={setSettings}
        kids={kids} setKids={setKids}
        history={history} setHistory={setHistory}
        setEntryFeedback={setEntryFeedback}
        onClearData={onClearData}
        fullscreen={fullscreen}
        billing={billing} onBillingChange={applyBilling}
        digestMeta={digestMeta} setDigestMeta={setDigestMeta}
      />
    );
  }

  const confirmDialog = (
    <ConfirmDialog
      open={clearConfirmOpen}
      danger
      title={tApp('settings.clearConfirmTitle')}
      body={tApp('settings.clearConfirm')}
      confirmLabel={tApp('settings.clearAll')}
      cancelLabel={tApp('common.cancel')}
      onCancel={() => setClearConfirmOpen(false)}
      onConfirm={confirmClearData}
    />
  );

  if (fullscreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', background: tokens.bg,
      }}>
        {inner}
        {confirmDialog}
      </div>
    );
  }
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
      <IOSDevice width={FRAME_W} height={FRAME_H}>{inner}</IOSDevice>
      {confirmDialog}
    </div>
  );
}

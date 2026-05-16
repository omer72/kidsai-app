import { useState, useEffect, useMemo, useCallback } from 'react';
import { applyTheme, tokens } from './theme';
import { loadSettings, saveSettings, loadKids, saveKids, loadHistory, appendHistory, updateHistoryEntry, clearAll } from './storage';
import { getGuidance, hasApiKey } from './openai';
import { initBilling, offUpdate, refreshEntitlement, billingAvailable } from './billing';
import { DEMO_RESPONSE } from './constants';
import { Icon } from './components/Icons';
import { IOSDevice } from './components/IOSFrame';
import { TabBar } from './components/primitives';
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

function MainApp({ settings, setSettings, kids, setKids, history, setHistory, setEntryFeedback, onClearData, fullscreen, billing, onBillingChange }) {
  const [tab, setTab] = useState(() => (kids.length === 0 ? 'kids' : 'home'));
  const [activeKidId, setActiveKidId] = useState(kids[0]?.id || null);
  const [flowState, setFlowState] = useState({ stage: 'compose', story: '', ctx: null, response: null, error: null });
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

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

  const submit = async ({ story, ctx }) => {
    setFlowState({ stage: 'thinking', story, ctx, response: null, error: null });
    try {
      let response;
      if (hasApiKey()) {
        response = await getGuidance({ story, ctx, kid: activeKid, history });
      } else {
        await new Promise((r) => setTimeout(r, 1800));
        response = DEMO_RESPONSE;
      }
      setFlowState((s) => ({ ...s, stage: 'response', response }));
    } catch (err) {
      console.error('OpenAI error:', err);
      setFlowState((s) => ({ ...s, stage: 'response', error: err.message || 'Something went wrong' }));
    }
  };

  const closeMoment = (feedback = null) => {
    if (flowState.response && !flowState.error) {
      const entry = {
        kidId: activeKid?.id,
        title: flowState.response.title || 'Moment',
        story: flowState.story,
        where: flowState.ctx?.location,
        mood: flowState.ctx?.mood,
        response: flowState.response,
        when: new Date().toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
        feedback: feedback?.rating || null,
        note: feedback?.note || null,
      };
      setHistory(appendHistory(entry));
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
        />
      );
    } else if (flowState.stage === 'followup') {
      content = <FollowupScreen kid={activeKid} onDone={closeMoment}/>;
    } else {
      content = (
        <FlowComponent
          key={settings.flow}
          kids={visibleKids}
          activeKid={activeKidId}
          setActiveKid={setActiveKidId}
          onSubmit={submit}
          onAddKid={() => setTab('kids')}
        />
      );
    }
  } else if (tab === 'history') {
    content = <HistoryScreen kids={visibleKids} history={history} activeKid={activeKidId} onFeedback={setEntryFeedback}/>;
  } else if (tab === 'kids') {
    content = (
      <KidsScreen
        kids={kids} setKids={setKids}
        activeKid={activeKidId} setActiveKid={setActiveKidId}
        history={history}
        entitled={entitled}
        lockedKidCount={lockedKidCount}
        onRequestUpgrade={() => setPaywallOpen(true)}
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
          onOpenUpgrade={() => setPaywallOpen(true)}
        />
      );
    }
  }

  const topBar = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: fullscreen
        ? 'max(96px, calc(env(safe-area-inset-top, 0px) + 36px)) 20px 8px'
        : '58px 20px 8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `radial-gradient(circle at 30% 30%, #5A7EFF 0%, ${tokens.primary} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 10px ${tokens.primary}40`,
        }}><Icon.Sparkle s={14} c="#fff"/></div>
        <div style={{ fontFamily: tokens.serif, fontSize: 19, fontWeight: 600, color: tokens.ink, letterSpacing: -0.3 }}>kidsit ai</div>
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
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{content}</div>
      <TabBar current={tab} onChange={setTab}/>
      {paywallOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: tokens.bg }}>
          <PaywallScreen
            fullscreen={fullscreen}
            onClose={() => setPaywallOpen(false)}
            onStart={() => setPaywallOpen(false)}
            onPurchased={(next) => { onBillingChange(next); setPaywallOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

export function App() {
  const [settings, setSettingsState] = useState(() => loadSettings());
  const [kids, setKidsState] = useState(() => loadKids());
  const [history, setHistory] = useState(() => loadHistory());
  const [phase, setPhase] = useState(settings.onboarded ? 'app' : 'welcome');
  const [billing, setBilling] = useState(() => settings.billing || { entitled: false });

  applyTheme(settings.theme);

  const { fullscreen, scale } = useViewport();

  const setSettings = (next) => {
    setSettingsState(next);
    saveSettings(next);
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
  const setKids = (next) => {
    setKidsState(next);
    saveKids(next);
  };
  const setEntryFeedback = (id, patch) => setHistory(updateHistoryEntry(id, patch));
  const onClearData = () => {
    if (!confirm('Clear all data? This cannot be undone.')) return;
    clearAll();
    const fresh = loadSettings();
    setSettingsState(fresh);
    setKidsState(loadKids());
    setHistory(loadHistory());
    setPhase('welcome');
  };

  const finishOnboarding = () => {
    const next = { ...settings, onboarded: true };
    setSettings(next);
    setPhase('app');
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
    inner = <OnboardingScreen onDone={() => setPhase('paywall')} fullscreen={fullscreen}/>;
  } else if (phase === 'paywall') {
    inner = (
      <PaywallScreen
        mode="upgrade"
        fullscreen={fullscreen}
        onStart={finishOnboarding}
        onPurchased={(next) => { applyBilling(next); finishOnboarding(); }}
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
      />
    );
  }

  if (fullscreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', background: tokens.bg,
      }}>
        {inner}
      </div>
    );
  }
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
      <IOSDevice width={FRAME_W} height={FRAME_H}>{inner}</IOSDevice>
    </div>
  );
}

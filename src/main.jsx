import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { App } from './App';
import { initKeyboardGuard } from './keyboard';
import { initBackButton } from './backbutton';

if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
  initKeyboardGuard();
  initBackButton();
  import('@capacitor/keyboard').then(({ Keyboard, KeyboardResize }) => {
    Keyboard.setResizeMode({ mode: KeyboardResize.None }).catch(() => {});
    Keyboard.setScroll({ isDisabled: true }).catch(() => {});
    Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
  }).catch(() => {});
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    setTimeout(() => { SplashScreen.hide().catch(() => {}); }, 400);
  }).catch(() => {});
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (!t) return;
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (t.closest?.('input, textarea, select')) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      active.blur();
    }
  }, true);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

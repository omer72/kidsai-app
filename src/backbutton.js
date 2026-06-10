// Android hardware back. Without a listener, Capacitor finishes the activity
// whenever the WebView has no history — which an SPA never has — so back
// killed the app mid-flow and dropped unsaved state.
//
// Screens register handlers with a priority (overlays > flow steps > tab
// navigation). A handler returns true to consume the press. If nobody
// consumes it, the app is minimized — backgrounded like the home button —
// so React state survives a relaunch.

import { useEffect } from 'react';

const handlers = new Set();

export function onHardwareBack(handler, priority = 0) {
  const entry = { handler, priority };
  handlers.add(entry);
  return () => { handlers.delete(entry); };
}

export function useHardwareBack(handler, priority = 0) {
  // Re-registers every render so the handler closure is never stale.
  useEffect(() => onHardwareBack(handler, priority));
}

export function initBackButton() {
  import('@capacitor/app')
    .then(({ App }) => {
      App.addListener('backButton', () => {
        const sorted = [...handlers].sort((a, b) => b.priority - a.priority);
        for (const { handler } of sorted) {
          if (handler() === true) return;
        }
        App.minimizeApp().catch(() => {});
      });
    })
    .catch(() => {});
}

// Generic local reminder. The body is chosen by the caller from a fixed
// template and must not include a child's name. Web builds no-op.

import { capacitorWeekday } from './taxonomy.js';

const NOTIFICATION_ID = 73421;

function isNative() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
}

async function localNotifications() {
  const mod = await import('@capacitor/local-notifications');
  return mod.LocalNotifications;
}

export async function cancelDigestNotification() {
  if (!isNative()) return;
  try {
    const LocalNotifications = await localNotifications();
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  } catch {
    // The in-app summary still works if the plugin is unavailable.
  }
}

export async function syncDigestNotification({ enabled, cadence, weekday, hour, body }) {
  if (!isNative()) return { scheduled: false, reason: 'web' };
  try {
    const LocalNotifications = await localNotifications();
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    if (!enabled) return { scheduled: false, reason: 'off' };
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return { scheduled: false, reason: 'denied' };
    const safeHour = Math.min(23, Math.max(0, Number.isFinite(Number(hour)) ? Number(hour) : 9));
    const on = cadence === 'day'
      ? { hour: safeHour, minute: 0 }
      : { weekday: capacitorWeekday(weekday), hour: safeHour, minute: 0 };
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIFICATION_ID,
        title: 'Kidsit',
        body: String(body || ''),
        // Inexact on Android. The plugin would otherwise request exact alarms.
        isExactNotification: false,
        schedule: { on, repeats: true, allowWhileIdle: false },
      }],
    });
    return { scheduled: true };
  } catch {
    return { scheduled: false, reason: 'error' };
  }
}

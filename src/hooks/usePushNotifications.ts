import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { notificationService } from '../services/notifications';

// Controls how a notification behaves while the app is in the
// foreground. Without this, foreground pushes are silently swallowed
// on iOS by default.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // heads-up banner while app is foregrounded
    shouldShowList: true,   // entry in the notification center/tray
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
/**
 * Registers the device for push notifications and sends the resulting
 * Expo push token to the backend. Call this once, inside AuthContext
 * right after a successful login()/loginWithGoogle().
 *
 * Owner-only: notifications are scoped to business owners (enforced
 * server-side in notify()), so pass `enabled={user?.role === 'owner'}`
 * from the call site to skip registering a token that could never
 * receive anything. Defaults to true so existing call sites keep
 * working unchanged until updated.
 *
 * Requires a development or production build. Remote push does not
 * work inside Expo Go as of SDK 53 — local/scheduled notifications
 * still do, but this hook is specifically about server-sent pushes.
 */
export function usePushNotifications(enabled: boolean = true) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    registerForPushNotificationsAsync().then(token => {
      if (cancelled) return;
      if (token) {
        setExpoPushToken(token);
        notificationService.registerToken(token, Platform.OS as 'ios' | 'android').catch(() => {
          // Registration failing shouldn't block app usage — the user
          // just won't get pushes until the next successful attempt.
        });
      } else {
        setPermissionDenied(true);
      }
    });

    return () => { cancelled = true; };
  }, [enabled]);

  return { expoPushToken, permissionDenied };
}

/**
 * Standalone version of the registration logic, exported separately
 * so it can also be called from a logout flow (to get the current
 * token for notificationService.unregisterToken) without re-running
 * the hook.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators/emulators can't receive real pushes

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  // console.log('EXPO PUSH TOKEN:', tokenData.data);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return tokenData.data; // "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}

/**
 * Call this at the start of every logout flow, before authService.logout().
 * Unregisters regardless of role — even a staff device that never
 * received anything should still have its token cleaned up, since a
 * later role change or reused device shouldn't inherit a stale row.
 * Best-effort: a failure here shouldn't block logout.
 */
export async function unregisterCurrentDeviceToken(): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  try {
    await notificationService.unregisterToken(token);
  } catch {
    // Stale token left registered after logout will eventually be
    // pruned via the DeviceNotRegistered path in send_push_to_tokens,
    // or reassigned if someone else logs in on this device.
  }
}
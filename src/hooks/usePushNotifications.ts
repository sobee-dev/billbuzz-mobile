import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { pushService } from '../services/push';

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
 * right after a successful login()/loginWithGoogle() — registering
 * before the user is authenticated has nowhere to send the token to.
 *
 * Requires a development or production build. Remote push does not
 * work inside Expo Go as of SDK 53 — local/scheduled notifications
 * still do, but this hook is specifically about server-sent pushes.
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    registerForPushNotificationsAsync().then(token => {
      if (cancelled) return;
      if (token) {
        setExpoPushToken(token);
        pushService.registerToken(token, Platform.OS as 'ios' | 'android').catch(() => {
          // Registration failing shouldn't block app usage — the user
          // just won't get pushes until the next successful attempt.
        });
      } else {
        setPermissionDenied(true);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { expoPushToken, permissionDenied };
}

/**
 * Standalone version of the registration logic, exported separately
 * so it can also be called from a logout flow (to get the current
 * token for pushService.unregisterToken) without re-running the hook.
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return tokenData.data; // "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
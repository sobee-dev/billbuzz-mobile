// lib/posthog.ts
import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

const projectToken = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined;
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined;

if (__DEV__ && (!projectToken || !host)) {
  // Warn, don't throw — a missing analytics key should never be able to
  // crash the app for a teammate who hasn't set up their .env yet.
  console.warn(
    '[PostHog] EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN / EXPO_PUBLIC_POSTHOG_HOST missing — analytics disabled.',
  );
}

let client: PostHog | null = null;
if (projectToken && host) {
  try {
    client = new PostHog(projectToken, { host });
  } catch (e) {
    console.warn('[PostHog] Failed to initialize:', e);
    client = null;
  }
}

export const posthog = client;

// Every call site should use these instead of `posthog?.xxx` directly —
// analytics failing must never be able to break the surrounding flow.
export function safeIdentify(id: string, props?: Record<string, any>) {
  try { client?.identify(id, props); } catch (e) { console.warn('[PostHog] identify failed:', e); }
}

export function safeCapture(event: string, props?: Record<string, any>) {
  try { client?.capture(event, props); } catch (e) { console.warn('[PostHog] capture failed:', e); }
}

export function safeCaptureException(err: unknown, props?: Record<string, any>) {
  try { client?.captureException(err, props); } catch (e) { console.warn('[PostHog] captureException failed:', e); }
}

export function safeReset() {
  try { client?.reset(); } catch (e) { console.warn('[PostHog] reset failed:', e); }
}
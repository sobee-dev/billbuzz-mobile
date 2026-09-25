import { useAuth } from '@/context/AuthContext';
import * as Notifications from 'expo-notifications';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationService } from '../services/notifications';

// One shared unread counter for the whole app. Any number of components can
// call useUnreadCount(); there is still only ever one timer, one AppState
// listener and one push listener, so a bell mounted twice can no longer
// double the traffic.
//
// How the count stays fresh:
//   1. fetched once when the first consumer mounts
//   2. refetched whenever the app returns to the foreground
//   3. refetched the moment a push notification arrives while the app is open
//   4. a slow fallback poll, only while the app is in the foreground, for the
//      cases where a push is delayed or the device can't receive pushes
//
// A 429 pauses all fetching for a while instead of hammering a throttled API.

const FALLBACK_POLL_MS = 30 * 60 * 1000;
const BACKOFF_MS = 15 * 60 * 1000;
const MIN_GAP_MS = 5 * 1000;

let count = 0;
let consumers = 0;
let inFlight = false;
let lastFetchAt = 0;
let blockedUntil = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let appStateSub: { remove: () => void } | null = null;
let pushSub: { remove: () => void } | null = null;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function emit() {
  listeners.forEach(l => l());
}

async function refresh(force = false) {
  const now = Date.now();
  if (inFlight || now < blockedUntil) return;
  if (!force && now - lastFetchAt < MIN_GAP_MS) return;

  inFlight = true;
  lastFetchAt = now;
  try {
    const next = await notificationService.unreadCount();
    if (next !== count) {
      count = next;
      emit();
    }
  } catch (err: any) {
    if (err?.response?.status === 429) {
      blockedUntil = Date.now() + BACKOFF_MS;
    }
    // Any other failure self-corrects on the next trigger.
  } finally {
    inFlight = false;
  }
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function scheduleNext() {
  clearTimer();
  timer = setTimeout(async () => {
    await refresh();
    if (consumers > 0 && AppState.currentState === 'active') scheduleNext();
  }, FALLBACK_POLL_MS);
}

function start() {
  refresh(true);
  scheduleNext();

  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      refresh();
      scheduleNext();
    } else {
      clearTimer();
    }
  });

  pushSub = Notifications.addNotificationReceivedListener(() => {
    refresh(true);
  });
}

function stop() {
  clearTimer();
  appStateSub?.remove();
  pushSub?.remove();
  appStateSub = null;
  pushSub = null;
  // Reset so the next person to sign in on this device never sees a stale badge.
  count = 0;
  blockedUntil = 0;
  lastFetchAt = 0;
  emit();
}

/** Call after marking notifications read, so the badge updates without waiting. */
export function refreshUnreadCount() {
  return refresh(true);
}

export function useUnreadCount() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    consumers += 1;
    if (consumers === 1) start();
    return () => {
      consumers -= 1;
      if (consumers === 0) stop();
    };
  }, [user]);

  const value = useSyncExternalStore(subscribe, () => count, () => 0);
  return { count: value, refresh: refreshUnreadCount };
}
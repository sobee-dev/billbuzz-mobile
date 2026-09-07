import axios, { InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from 'jwt-decode';
import { Platform } from 'react-native';

export const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// ── Dev API URL auto-detection ──────────────────────────────────────────────
// In dev, Metro's bundler and your backend usually run on the same machine,
// so whatever IP the phone used to reach Metro is the same IP that reaches
// the API. This means the backend host follows you across network changes
// (new Wi-Fi, router restart, etc.) with no manual .env edits.
// EXPO_PUBLIC_API_URL still wins when set — use it for staging/production
// builds, tunnels, or any case where you need a fixed, explicit URL.
function getDevApiUrl(port = 8000): string {
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:${port}` : 'http://localhost:8000';
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDevApiUrl();

if (__DEV__) {
  console.log('[api] baseURL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const AUTH_ACCESS_KEY = 'access_token';
export const AUTH_REFRESH_KEY = 'refresh_token';
export const AUTH_SESSION_DEADLINE_KEY = 'session_deadline'; // ms epoch, absolute cap
export const AUTH_REFRESH_EXP_KEY = 'refresh_token_exp';     // ms epoch, rolling

const MAX_SESSION_AGE_MS = 14 * 24 * 60 * 60 * 1000; // must mirror MAX_SESSION_AGE server-side

export const saveTokens = async (access: string, refresh: string) => {
  await storage.setItem(AUTH_ACCESS_KEY, access);
  await storage.setItem(AUTH_REFRESH_KEY, refresh);
  try {
    const decoded = jwtDecode<{ exp: number; orig_iat?: number }>(refresh);
    await storage.setItem(AUTH_REFRESH_EXP_KEY, String(decoded.exp * 1000));

    if (decoded.orig_iat) {
      const sessionDeadline = decoded.orig_iat * 1000 + MAX_SESSION_AGE_MS;
      await storage.setItem(AUTH_SESSION_DEADLINE_KEY, String(sessionDeadline));
    }
  } catch {
    // not decodable — fall back to reactive-only logout
  }

};

export const clearTokens = async () => {
  await storage.removeItem(AUTH_ACCESS_KEY);
  await storage.removeItem(AUTH_REFRESH_KEY);
  await storage.removeItem(AUTH_REFRESH_EXP_KEY);
  await storage.removeItem(AUTH_SESSION_DEADLINE_KEY);
};

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getItem(AUTH_ACCESS_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error),
);

let refreshPromise: Promise<string | null> | null = null;


// A minimal pub/sub so axios (which has no access to React context) can
// tell AuthContext "the session just died" without a circular import.

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  onSessionExpired = handler;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getItem(AUTH_REFRESH_KEY);
  if (!refreshToken) {
    onSessionExpired?.();   // no refresh token at all — session is dead
    return null;
  }

  try {
    const { data } = await axios.post(
      `${api.defaults.baseURL}/api/users/token/refresh/`,
      { refresh: refreshToken },
    );
    await saveTokens(data.access, data.refresh);
    return data.access;
  } catch {
    await clearTokens();
    onSessionExpired?.();   // refresh failed — session is dead
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
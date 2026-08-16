import axios, { InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from "expo-secure-store";
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

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const AUTH_ACCESS_KEY = 'access_token';
export const AUTH_REFRESH_KEY = 'refresh_token';

export const saveTokens = async (access: string, refresh: string) => {
  await storage.setItem(AUTH_ACCESS_KEY, access);
  await storage.setItem(AUTH_REFRESH_KEY, refresh);
};

export const clearTokens = async () => {
  await storage.removeItem(AUTH_ACCESS_KEY);
  await storage.removeItem(AUTH_REFRESH_KEY);
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

// ── Response interceptor: on a 401, use the refresh token to get a new
// access + refresh pair, then retry the original request once. Concurrent
// requests that all 401 at once share a single in-flight refresh instead of
// each firing their own — otherwise a burst of parallel calls would rotate
// the refresh token multiple times and invalidate itself mid-flight.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getItem(AUTH_REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(
      `${api.defaults.baseURL}/api/users/token/refresh/`,
      { refresh: refreshToken },
    );
    await saveTokens(data.access, data.refresh);
    return data.access;
  } catch {
    await clearTokens();
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
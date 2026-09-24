// context/AuthContext.tsx
import { unregisterCurrentDeviceToken, usePushNotifications } from '@/hooks/usePushNotifications';
import {
  AUTH_REFRESH_EXP_KEY,
  AUTH_REFRESH_KEY,
  AUTH_SESSION_DEADLINE_KEY,
  clearTokens,
  setSessionExpiredHandler,
  setThrottledHandler,
  storage,
} from '@/lib/axios';
import { posthog, safeCapture, safeCaptureException, safeIdentify, safeReset } from '@/lib/posthog';
import { authService, AuthUser, LoginPayload } from '@/services/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

interface AuthContextType {
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  loginWithGoogle: (code: string, redirectUri: string) => Promise<{ user: AuthUser; isNew: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;        // ONLY: initial session restore on app boot
  isAuthenticating: boolean; // login/loginWithGoogle in flight (optional, if you want it shared)
  throttledUntil: number | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);           // boot-time only
  const [isAuthenticating, setIsAuthenticating] = useState(false); // login-action only
  const [throttledUntil, setThrottledUntil] = useState<number | null>(null);

  usePushNotifications(user?.role === 'owner');

  const identifyUser = (authenticatedUser: AuthUser) => {
    safeIdentify(authenticatedUser.id, {
      email: authenticatedUser.email,
      first_name: authenticatedUser.firstName,
      last_name: authenticatedUser.lastName,
      role: authenticatedUser.role,
    });
  };

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    return () => setSessionExpiredHandler(null);
  }, []);

   // ── Throttle handler — mirrors the session-expired wiring above ──────────
  useEffect(() => {
    setThrottledHandler((retryAfterSeconds) => {
      setThrottledUntil(Date.now() + retryAfterSeconds * 1000);
    });
    return () => setThrottledHandler(null);
  }, []);


  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refresh = await storage.getItem(AUTH_REFRESH_KEY);
        if (refresh) {
          const userData = await authService.me();
          identifyUser(userData);
          setUser(userData);
        }
      } catch (e) {
        safeCaptureException(e);
        await clearTokens();
      }
    };
    restoreSession();
  }, []);

  // ── Proactive expiry timer: logs out the instant the refresh token or
  // the 14-day session ceiling (whichever is sooner) is reached, without
  // waiting for a real API call to fail first.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleExpiryCheck = async () => {
      if (timer) clearTimeout(timer);

      const [expStr, sessionStr] = await Promise.all([
        storage.getItem(AUTH_REFRESH_EXP_KEY),
        storage.getItem(AUTH_SESSION_DEADLINE_KEY),
      ]);
      if (!expStr) return;

      const candidates = [Number(expStr)];
      if (sessionStr) candidates.push(Number(sessionStr));
      const deadline = Math.min(...candidates); // whichever comes first wins

      const msLeft = deadline - Date.now();

      if (msLeft <= 0) {
        await clearTokens();
        setUser(null);
        return;
      }

      timer = setTimeout(async () => {
        await clearTokens();
        setUser(null);
      }, msLeft);
    };

    scheduleExpiryCheck(); // on mount / whenever user changes (fresh login → fresh deadlines)

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleExpiryCheck(); // re-check/re-arm on foreground
    });

    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [user]);

  const refreshUser = async () => {
    const userData = await authService.me();
    setUser(userData);
  };

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    setIsAuthenticating(true);
    try {
      const res = await authService.login(payload);
      identifyUser(res.user);
      safeCapture('user_logged_in', { auth_method: 'email', role: res.user.role });
      setUser(res.user);
      return res.user;
      } catch (error) {
        safeCaptureException(error, { auth_method: 'email' });
        throw error;
      } finally {
      setIsAuthenticating(false);
    }
  };

  const loginWithGoogle = async (code: string, redirectUri: string) => {
    setIsAuthenticating(true);
    try {
      const res = await authService.googleLogin(code, redirectUri);
      identifyUser(res.user);
      posthog?.capture('user_logged_in', {
        auth_method: 'google',
        role: res.user.role,
      });
      if (res.isNew) {
        posthog?.capture('account_created', { auth_method: 'google' });
      }
      setUser(res.user);
      return { user: res.user, isNew: res.isNew };
    } catch (error) {
      posthog?.captureException(error, { auth_method: 'google' });
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await unregisterCurrentDeviceToken();
    await authService.logout();
    safeReset();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, refreshUser, isLoading, isAuthenticating, throttledUntil }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
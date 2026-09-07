// context/AuthContext.tsx
import {
  AUTH_REFRESH_EXP_KEY,
  AUTH_REFRESH_KEY,
  AUTH_SESSION_DEADLINE_KEY,
  clearTokens,
  setSessionExpiredHandler,
  storage,
} from '@/lib/axios';
import { authService, AuthUser, LoginPayload } from '@/services/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

interface AuthContextType {
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  loginWithGoogle: (code: string, redirectUri: string) => Promise<{ user: AuthUser; isNew: boolean }>;
  logout: () => Promise<void>;
  isLoading: boolean;        // ONLY: initial session restore on app boot
  isAuthenticating: boolean; // login/loginWithGoogle in flight (optional, if you want it shared)
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);           // boot-time only
  const [isAuthenticating, setIsAuthenticating] = useState(false); // login-action only

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refresh = await storage.getItem(AUTH_REFRESH_KEY);
        if (refresh) {
          const userData = await authService.me();
          setUser(userData);
        }
      } catch (e) {
        await clearTokens();
      } finally {
        setIsLoading(false);
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

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    setIsAuthenticating(true);
    try {
      const res = await authService.login(payload);
      setUser(res.user);
      return res.user;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loginWithGoogle = async (code: string, redirectUri: string) => {
    setIsAuthenticating(true);
    try {
      const res = await authService.googleLogin(code, redirectUri);
      setUser(res.user);
      return { user: res.user, isNew: res.isNew };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, isLoading, isAuthenticating }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
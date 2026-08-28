// context/AuthContext.tsx
import { AUTH_REFRESH_KEY, clearTokens, storage } from '@/lib/axios';
import { authService, AuthUser, LoginPayload } from '@/services/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  loginWithGoogle: (code: string, redirectUri: string) => Promise<{ user: AuthUser; isNew: boolean }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refresh = await storage.getItem(AUTH_REFRESH_KEY);
        if (refresh) {
          // If we have a refresh token, we can fetch the user profile
          // ( API should be set up to validate the refresh token/session here)
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

  

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const res = await authService.login(payload);
      setUser(res.user);
      return res.user;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (code: string, redirectUri: string) => {
    setIsLoading(true);
    try {
      const res = await authService.googleLogin(code, redirectUri);
      setUser(res.user);
      return { user: res.user, isNew: res.isNew };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
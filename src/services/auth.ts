import api, { AUTH_REFRESH_KEY, clearTokens, saveTokens } from '@/lib/axios';
import * as SecureStore from "expo-secure-store";

export interface LoginPayload    { email: string; password: string; }
export interface RegisterPayload { email: string; password: string; }

export interface AuthUser {
  id:         string;
  email:      string;
  role:       'owner' | 'staff' ;
  firstName?:      string;
  laststName?:      string;
  avatarColor?: string;
  hasBusiness?: boolean;
  fullName?: string;
}

export interface AuthResponse {
  access:  string;
  refresh: string;
  user:    AuthUser;
}

export const authService = {
  /** Email + password login — stores tokens on success */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    
    const { data } = await api.post<AuthResponse>('/api/users/login/', payload);
    
    await saveTokens(data.access, data.refresh);
    
    return data;
  },

  /** Create a new owner account — stores tokens on success */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/api/users/register/', payload);
    await saveTokens(data.access, data.refresh);
    return data;
  },

  /** Logout — blacklists the refresh token on the server + clears local storage */
  async logout(): Promise<void> {
    
    const refresh = await SecureStore.getItemAsync(AUTH_REFRESH_KEY);
    try {
      await api.post('/api/users/logout/', { refresh });
    } finally {
      await clearTokens();
    }
  },

  /** Fetch current user profile */
  async me(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>('/api/users/me/');
    // const business = user?.business?.name
    return data;
  },

  /** Change password (requires old password) */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/api/users/change_password/', { oldPassword, newPassword });
  },

  /** Update email/push notification preferences */
  async updateNotifications(
    emailNotifications: boolean,
    pushNotifications:  boolean,
  ): Promise<void> {
    await api.patch('/api/users/update_notifications/', {
      emailNotifications,
      pushNotifications,
    });
  },

  /** Trigger email verification resend */
  async verifyEmail(token: string): Promise<void> {
    await api.post('/api/users/verify_email/', { token });
  },
};

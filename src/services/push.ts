import api from '../lib/axios';

export type PushPlatform = 'ios' | 'android';

export const pushService = {
  /** Call after login, and again whenever Expo issues a fresh token. */
  async registerToken(expoPushToken: string, platform?: PushPlatform): Promise<void> {
    await api.post('/api/push/register/', { expoPushToken, platform });
  },

  /** Call on logout so a signed-out device stops receiving pushes for the account it just left. */
  async unregisterToken(expoPushToken: string): Promise<void> {
    await api.post('/api/push/unregister/', { expoPushToken });
  },
};
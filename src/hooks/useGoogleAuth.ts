import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // required — this is the "audience" your backend verifies against
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: false,
});

export function useGoogleAuth() {
  async function signInAsync(): Promise<{ idToken: string } | null> {
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      return idToken ? { idToken } : null;
    } catch (err: any) {
      if (err.code === 'SIGN_IN_CANCELLED') return null; // user backed out, not an error
      throw err;
    }
  }

  return { signInAsync, ready: true };
}
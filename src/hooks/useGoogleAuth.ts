import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useRef } from 'react';

WebBrowser.maybeCompleteAuthSession(); // needed for the web platform's popup; harmless on native

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

// Registered with Google Console + the Django allow-list. Must be https —
// Google's Web-type client won't accept a custom scheme here.
const BRIDGE_REDIRECT_URI = `${process.env.EXPO_PUBLIC_API_URL}/oauth/mobile-callback/`;

// What the OS actually watches for to close the browser and hand control
// back to the app. Must match app.json's "scheme".
const NATIVE_RETURN_URL = 'billbuzz://oauth/callback';

function randomState(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface GoogleAuthResult {
  code: string;
  redirectUri: string; // pass this exact value to authService.googleLogin — the token exchange must use the same redirect_uri Google issued the code against
}

export function useGoogleAuth() {
  const stateRef = useRef<string | null>(null);
  console.log('BRIDGE_REDIRECT_URI:', BRIDGE_REDIRECT_URI);
//   console.log('AUTH URL:', authUrl);
  const signInAsync = useCallback(async (): Promise<GoogleAuthResult | null> => {
    const state = randomState();
    stateRef.current = state;

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: BRIDGE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state,
    });

    const authUrl = `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, NATIVE_RETURN_URL);

    if (result.type !== 'success' || !result.url) {
      return null; // user cancelled/dismissed — not an error, caller just no-ops
    }

    const { queryParams } = Linking.parse(result.url);
    const code = queryParams?.code as string | undefined;
    const returnedState = queryParams?.state as string | undefined;
    const oauthError = queryParams?.error as string | undefined;

    if (oauthError) throw new Error(oauthError);
    if (!code) throw new Error('No authorization code returned.');
    if (returnedState !== stateRef.current) throw new Error('State mismatch — aborting.');

    return { code, redirectUri: BRIDGE_REDIRECT_URI };
  }, []);

  return { signInAsync };
}
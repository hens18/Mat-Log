// The signed-in Cognito session: saved to device storage so it survives
// restarts, and refreshed shortly before the ID token expires. The data
// client asks for a token on every request through getIdToken().

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CognitoError, refresh, type Tokens } from './cognito';

const STORAGE_KEY = 'mat-log-session';
/** Refresh this long before the token expires, so requests never race it. */
const REFRESH_MARGIN_MS = 60_000;

let current: Tokens | null = null;
let refreshing: Promise<Tokens | null> | null = null;
const listeners = new Set<(tokens: Tokens | null) => void>();

export function getSession(): Tokens | null {
  return current;
}

export function onSessionChange(listener: (tokens: Tokens | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function setSession(tokens: Tokens | null): Promise<void> {
  current = tokens;
  if (tokens) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  else await AsyncStorage.removeItem(STORAGE_KEY);
  listeners.forEach((listener) => listener(tokens));
}

/** Restores the saved session at startup, refreshing it if it's stale. */
export async function loadSession(): Promise<Tokens | null> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    current = saved ? (JSON.parse(saved) as Tokens) : null;
  } catch {
    current = null;
  }
  if (current) await getIdToken();
  return current;
}

async function refreshNow(tokens: Tokens): Promise<Tokens | null> {
  try {
    const next = await refresh(tokens.refreshToken);
    await setSession(next);
    return next;
  } catch (error) {
    // A revoked or expired refresh token means signing in again; a network
    // blip keeps the old tokens so offline mode still shows cached data.
    if (error instanceof CognitoError && error.code === 'NotAuthorizedException') {
      await setSession(null);
      return null;
    }
    return tokens;
  }
}

/** A valid ID token for API requests, or null when signed out. */
export async function getIdToken(): Promise<string | null> {
  const tokens = current;
  if (!tokens) return null;
  if (tokens.expiresAt - Date.now() > REFRESH_MARGIN_MS) return tokens.idToken;
  refreshing ??= refreshNow(tokens).finally(() => {
    refreshing = null;
  });
  return (await refreshing)?.idToken ?? null;
}

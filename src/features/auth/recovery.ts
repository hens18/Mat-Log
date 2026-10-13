// Password reset links from Supabase carry the session tokens (or an error)
// after the # in the URL, which Expo Router's params don't expose.

/** Reads the tokens or error Supabase puts after the # (or ?) in a reset link. */
export function parseRecoveryLink(url: string | null) {
  if (!url) return null;
  const fragment = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  const params = new URLSearchParams(fragment);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    error: params.get('error_description')?.replace(/\+/g, ' ') ?? null,
  };
}

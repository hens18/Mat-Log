import { parseRecoveryLink } from '../recovery';

describe('parseRecoveryLink', () => {
  it('reads tokens from the fragment of a deep link', () => {
    expect(
      parseRecoveryLink(
        'matlog://reset-password#access_token=abc&expires_in=3600&refresh_token=def&type=recovery',
      ),
    ).toEqual({ accessToken: 'abc', refreshToken: 'def', error: null });
  });

  it('reads an expired-link error', () => {
    expect(
      parseRecoveryLink(
        'http://localhost:8081/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toEqual({
      accessToken: null,
      refreshToken: null,
      error: 'Email link is invalid or has expired',
    });
  });

  it('handles a plain link and no link', () => {
    expect(parseRecoveryLink('exp://192.168.1.5:8081/--/reset-password')).toEqual({
      accessToken: null,
      refreshToken: null,
      error: null,
    });
    expect(parseRecoveryLink(null)).toBeNull();
  });
});

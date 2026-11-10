// Amazon Cognito sign-in, called directly over its JSON API (no SDK needed).
// Every call here is one Cognito allows from a public app client without
// AWS credentials: sign up, confirm, sign in, refresh, reset, delete.
// https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/

import { env } from './env';

export type Tokens = {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  /** When the ID token expires, in milliseconds since the epoch. */
  expiresAt: number;
};

export type TokenClaims = { sub: string; email?: string; exp: number };

/** A Cognito error with a message fit to show a wrestler. */
export class CognitoError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CognitoError';
  }
}

const FRIENDLY: Record<string, string> = {
  NotAuthorizedException: 'Incorrect email or password.',
  UserNotFoundException: 'Incorrect email or password.',
  UsernameExistsException: 'An account with this email already exists. Try signing in.',
  UserNotConfirmedException: 'Confirm your email first. Check your inbox for the code.',
  CodeMismatchException: "That code doesn't match. Check the email and try again.",
  ExpiredCodeException: 'That code has expired. Send a new one.',
  InvalidPasswordException: 'Password must be at least 8 characters with a number and a letter.',
  LimitExceededException: 'Too many attempts. Wait a few minutes and try again.',
  TooManyRequestsException: 'Too many attempts. Wait a few minutes and try again.',
  InvalidParameterException: 'Check the email address and try again.',
};

async function call<T>(action: string, body: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(env.cognitoEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CognitoError('NetworkError', 'Check your connection and try again.');
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const code = String(data.__type ?? 'UnknownError')
      .split('#')
      .pop()!;
    throw new CognitoError(code, FRIENDLY[code] ?? data.message ?? 'Something went wrong.');
  }
  return data as T;
}

/** Reads a JWT's payload. The API verifies signatures; this only reads them. */
export function decodeClaims(token: string): TokenClaims {
  const part = token.split('.')[1] ?? '';
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(globalThis.atob(padded));
}

type AuthResult = {
  AuthenticationResult?: {
    IdToken: string;
    AccessToken: string;
    RefreshToken?: string;
  };
  ChallengeName?: string;
};

function toTokens(result: AuthResult, refreshToken?: string): Tokens {
  const auth = result.AuthenticationResult;
  if (!auth) {
    throw new CognitoError(
      result.ChallengeName ?? 'ChallengeRequired',
      'Sign-in needs another step this app does not support yet.',
    );
  }
  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken ?? refreshToken ?? '',
    expiresAt: decodeClaims(auth.IdToken).exp * 1000,
  };
}

const clientId = () => env.cognitoClientId;

export async function signUp(email: string, password: string): Promise<{ confirmed: boolean }> {
  const result = await call<{ UserConfirmed: boolean }>('SignUp', {
    ClientId: clientId(),
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  });
  return { confirmed: result.UserConfirmed };
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await call('ConfirmSignUp', { ClientId: clientId(), Username: email, ConfirmationCode: code });
}

export async function resendConfirmationCode(email: string): Promise<void> {
  await call('ResendConfirmationCode', { ClientId: clientId(), Username: email });
}

export async function signIn(email: string, password: string): Promise<Tokens> {
  return toTokens(
    await call<AuthResult>('InitiateAuth', {
      ClientId: clientId(),
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
}

/** New ID and access tokens; Cognito keeps the same refresh token. */
export async function refresh(refreshToken: string): Promise<Tokens> {
  return toTokens(
    await call<AuthResult>('InitiateAuth', {
      ClientId: clientId(),
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }),
    refreshToken,
  );
}

export async function forgotPassword(email: string): Promise<void> {
  await call('ForgotPassword', { ClientId: clientId(), Username: email });
}

export async function confirmForgotPassword(
  email: string,
  code: string,
  password: string,
): Promise<void> {
  await call('ConfirmForgotPassword', {
    ClientId: clientId(),
    Username: email,
    ConfirmationCode: code,
    Password: password,
  });
}

/** Signs out everywhere by revoking the refresh token. Best effort. */
export async function revoke(refreshToken: string): Promise<void> {
  await call('RevokeToken', { ClientId: clientId(), Token: refreshToken });
}

export async function deleteUser(accessToken: string): Promise<void> {
  await call('DeleteUser', { AccessToken: accessToken });
}

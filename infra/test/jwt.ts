// Test helpers that sign tokens the way Cognito does (RS256 with a key id),
// so PostgREST can verify them against a JWKS exactly as it will in AWS.

import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';

export type Keys = { privateKey: KeyObject; jwks: { keys: object[] }; kid: string };

export function makeKeys(kid = 'test-key-1'): Keys {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  return { privateKey, kid, jwks: { keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] } };
}

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

export function signJwt(keys: Keys, claims: Record<string, unknown>): string {
  const header = b64({ alg: 'RS256', typ: 'JWT', kid: keys.kid });
  const body = b64(claims);
  const signature = createSign('RSA-SHA256').update(`${header}.${body}`).sign(keys.privateKey);
  return `${header}.${body}.${signature.toString('base64url')}`;
}

/** Claims shaped like a Cognito ID token after the pre-token Lambda adds role. */
export function idTokenClaims(sub: string, email: string, clientId: string, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub,
    email,
    email_verified: true,
    aud: clientId,
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST',
    token_use: 'id',
    'cognito:username': sub,
    role: 'authenticated',
    iat: now,
    exp: now + ttlSeconds,
  };
}

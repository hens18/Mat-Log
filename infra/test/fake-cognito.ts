// A local stand-in for the two AWS front doors the app talks to, for tests:
//   POST /            Cognito's JSON API (sign up, confirm, sign in, refresh,
//                     reset, revoke, delete), signing ID tokens like the real
//                     pool plus the pre-token Lambda's role claim
//   ANY /rest/v1/*    forwarded to local PostgREST, like API Gateway does
//   GET /__codes      the latest emailed code per address (tests only)
//
//   npx tsx test/fake-cognito.ts <stateDir>   (after local-stack.ts up)

import { createPrivateKey, randomInt, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';

import { idTokenClaims, signJwt, type Keys } from './jwt';

const PORT = Number(process.env.FAKE_COGNITO_PORT ?? 53100);
const POSTGREST = process.env.POSTGREST_URL ?? 'http://localhost:53000';
const CLIENT_ID = 'local-test-client';
const ID_TOKEN_TTL = Number(process.env.ID_TOKEN_TTL ?? 3600);
// Skips email confirmation, like a pool with a pre-sign-up auto-confirm trigger.
const AUTO_CONFIRM = process.env.AUTO_CONFIRM === '1';

const state = JSON.parse(readFileSync(join(process.argv[2] ?? '.local', 'keys.json'), 'utf8'));
const keys: Keys = {
  kid: state.kid,
  privateKey: createPrivateKey(state.privateKeyPem),
  jwks: state.jwks,
};

type User = { sub: string; email: string; password: string; confirmed: boolean };
const users = new Map<string, User>();
const codes = new Map<string, string>();
const refreshTokens = new Map<string, string>();
const accessTokens = new Map<string, string>();

class CognitoFault extends Error {
  constructor(
    readonly type: string,
    message: string,
  ) {
    super(message);
  }
}

const sendCode = (email: string) => {
  const code = String(randomInt(100000, 1000000));
  codes.set(email, code);
  return code;
};

function issue(user: User, refreshToken?: string) {
  const access = randomUUID();
  accessTokens.set(access, user.email);
  const refresh = refreshToken ?? randomUUID();
  refreshTokens.set(refresh, user.email);
  return {
    AuthenticationResult: {
      IdToken: signJwt(keys, idTokenClaims(user.sub, user.email, CLIENT_ID, ID_TOKEN_TTL)),
      AccessToken: access,
      ...(refreshToken ? {} : { RefreshToken: refresh }),
      ExpiresIn: ID_TOKEN_TTL,
      TokenType: 'Bearer',
    },
  };
}

function checkPassword(password: string) {
  if (!/^(?=.*\d).{8,}$/.test(password)) {
    throw new CognitoFault('InvalidPasswordException', 'Password did not conform with policy');
  }
}

const handlers: Record<string, (body: Record<string, any>) => object> = {
  SignUp({ Username, Password }) {
    if (users.has(Username))
      throw new CognitoFault('UsernameExistsException', 'User already exists');
    checkPassword(Password);
    users.set(Username, {
      sub: randomUUID(),
      email: Username,
      password: Password,
      confirmed: AUTO_CONFIRM,
    });
    if (!AUTO_CONFIRM) sendCode(Username);
    return { UserConfirmed: AUTO_CONFIRM, UserSub: users.get(Username)!.sub };
  },
  ConfirmSignUp({ Username, ConfirmationCode }) {
    const user = users.get(Username);
    if (!user || codes.get(Username) !== ConfirmationCode) {
      throw new CognitoFault('CodeMismatchException', 'Invalid verification code provided');
    }
    user.confirmed = true;
    codes.delete(Username);
    return {};
  },
  ResendConfirmationCode({ Username }) {
    if (users.has(Username)) sendCode(Username);
    return {};
  },
  InitiateAuth({ AuthFlow, AuthParameters }) {
    if (AuthFlow === 'REFRESH_TOKEN_AUTH') {
      const email = refreshTokens.get(AuthParameters.REFRESH_TOKEN);
      const user = email && users.get(email);
      if (!user) throw new CognitoFault('NotAuthorizedException', 'Invalid Refresh Token');
      return issue(user, AuthParameters.REFRESH_TOKEN);
    }
    const user = users.get(AuthParameters.USERNAME);
    if (!user || user.password !== AuthParameters.PASSWORD) {
      throw new CognitoFault('NotAuthorizedException', 'Incorrect username or password.');
    }
    if (!user.confirmed)
      throw new CognitoFault('UserNotConfirmedException', 'User is not confirmed.');
    return issue(user);
  },
  ForgotPassword({ Username }) {
    if (users.has(Username)) sendCode(Username);
    return { CodeDeliveryDetails: { DeliveryMedium: 'EMAIL' } };
  },
  ConfirmForgotPassword({ Username, ConfirmationCode, Password }) {
    const user = users.get(Username);
    if (!user || codes.get(Username) !== ConfirmationCode) {
      throw new CognitoFault('CodeMismatchException', 'Invalid verification code provided');
    }
    checkPassword(Password);
    user.password = Password;
    codes.delete(Username);
    return {};
  },
  RevokeToken({ Token }) {
    refreshTokens.delete(Token);
    return {};
  },
  DeleteUser({ AccessToken }) {
    const email = accessTokens.get(AccessToken);
    if (!email) throw new CognitoFault('NotAuthorizedException', 'Invalid access token');
    users.delete(email);
    return {};
  },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-amz-target,x-amz-user-agent',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function proxy(req: IncomingMessage, res: ServerResponse) {
  const path = req.url!.replace(/^\/rest\/v1/, '') || '/';
  const headers = { ...req.headers } as Record<string, string>;
  delete headers.host;
  const body = ['GET', 'HEAD'].includes(req.method!) ? undefined : await readBody(req);
  const upstream = await fetch(`${POSTGREST}${path}`, { method: req.method, headers, body });
  const out: Record<string, string> = {};
  upstream.headers.forEach((value, key) => {
    if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key)) out[key] = value;
  });
  res.writeHead(upstream.status, out);
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

createServer(async (req, res) => {
  try {
    if (req.url!.startsWith('/rest/v1/')) return await proxy(req, res);
    if (req.url!.startsWith('/__codes')) {
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
      return res.end(JSON.stringify(Object.fromEntries(codes)));
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      return res.end();
    }
    const action = String(req.headers['x-amz-target'] ?? '')
      .split('.')
      .pop()!;
    const handler = handlers[action];
    if (!handler) throw new CognitoFault('InvalidActionException', `Unsupported action ${action}`);
    const result = handler(JSON.parse((await readBody(req)).toString() || '{}'));
    res.writeHead(200, { 'Content-Type': 'application/x-amz-json-1.1', ...CORS });
    res.end(JSON.stringify(result));
  } catch (error) {
    const fault =
      error instanceof CognitoFault
        ? error
        : new CognitoFault('InternalErrorException', String(error));
    res.writeHead(400, { 'Content-Type': 'application/x-amz-json-1.1', ...CORS });
    res.end(JSON.stringify({ __type: fault.type, message: fault.message }));
  }
}).listen(PORT, () => console.log(`Fake Cognito + API proxy on http://localhost:${PORT}`));

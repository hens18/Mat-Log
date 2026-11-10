// Runs the PostgREST Lambda adapter (lambda/postgrest/index.mjs) against the
// local PostgREST with API Gateway HTTP API (v2) events, as AWS would.
//
//   npm run local
//   MATLOG_STATE=.local node --test --import tsx test/postgrest-lambda.integration.ts

import assert from 'node:assert/strict';
import { createPrivateKey, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';

import { idTokenClaims, signJwt, type Keys } from './jwt';

process.env.POSTGREST_UPSTREAM = 'http://localhost:53000';
const state = JSON.parse(readFileSync(join(process.env.MATLOG_STATE!, 'keys.json'), 'utf8'));
const keys: Keys = {
  kid: state.kid,
  privateKey: createPrivateKey(state.privateKeyPem),
  jwks: state.jwks,
};

let handler: (typeof import('../lambda/postgrest/index.mjs'))['handler'];

const sub = randomUUID();
const token = signJwt(keys, idTokenClaims(sub, 'lambda@example.com', 'local-test-client'));

function event(
  method: string,
  path: string,
  opts: { query?: string; body?: object; headers?: Record<string, string>; base64?: boolean } = {},
) {
  const raw = opts.body ? JSON.stringify(opts.body) : undefined;
  return {
    version: '2.0',
    routeKey: 'ANY /rest/v1/{proxy+}',
    rawPath: path,
    rawQueryString: opts.query ?? '',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      host: 'abc.execute-api.us-east-1.amazonaws.com',
      ...opts.headers,
    },
    requestContext: { http: { method, path } },
    body: raw && opts.base64 ? Buffer.from(raw).toString('base64') : raw,
    isBase64Encoded: !!opts.base64,
  };
}

describe('PostgREST Lambda adapter', () => {
  before(async () => {
    handler = (await import('../lambda/postgrest/index.mjs')).handler;
    const created = await handler(event('POST', '/rest/v1/rpc/ensure_my_account'));
    assert.equal(created.statusCode, 204);
  });

  it('strips /rest/v1 and passes query strings through', async () => {
    const res = await handler(event('GET', '/rest/v1/profiles', { query: 'select=id' }));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body), [{ id: sub }]);
    assert.match(res.headers['content-type'], /json/);
  });

  it('passes writes, Prefer headers, and base64 bodies through', async () => {
    const res = await handler(
      event('POST', '/rest/v1/weigh_ins', {
        body: { weight: 150.2, kind: 'morning' },
        headers: { prefer: 'return=representation' },
        base64: true,
      }),
    );
    assert.equal(res.statusCode, 201);
    assert.equal(JSON.parse(res.body)[0].weight, 150.2);
    assert.equal(res.isBase64Encoded, false);
  });

  it('calls functions and returns empty bodies cleanly', async () => {
    const res = await handler(
      event('POST', '/rest/v1/rpc/convert_weight_unit', { body: { target: 'kg' } }),
    );
    assert.equal(res.statusCode, 204);
    assert.equal(res.body, '');
  });

  it('answers the browser CORS preflight', async () => {
    const res = await handler(
      event('OPTIONS', '/rest/v1/weigh_ins', {
        headers: {
          origin: 'http://localhost:8081',
          'access-control-request-method': 'POST',
          'access-control-request-headers':
            'authorization,apikey,x-client-info,content-type,prefer',
        },
      }),
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['access-control-allow-origin'], '*');
    assert.match(res.headers['access-control-allow-headers'], /x-client-info/);
  });

  it('rejects a bad token', async () => {
    const res = await handler(
      event('GET', '/rest/v1/weigh_ins', { headers: { authorization: 'Bearer nope' } }),
    );
    assert.equal(res.statusCode, 401);
  });
});

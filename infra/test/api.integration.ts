// End-to-end checks of the AWS data tier over HTTP, against the local stack
// from test/local-stack.ts: tokens signed like Cognito's, PostgREST in front
// of plain Postgres, and every privacy rule from the app's migrations.
//
//   npx tsx test/local-stack.ts up <stateDir>
//   MATLOG_STATE=<stateDir> node --test --import tsx test/api.integration.ts

import assert from 'node:assert/strict';
import { createPrivateKey, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';

import { idTokenClaims, signJwt, type Keys } from './jwt';

const API = 'http://localhost:53000';
const CLIENT_ID = 'local-test-client';
const state = JSON.parse(readFileSync(join(process.env.MATLOG_STATE!, 'keys.json'), 'utf8'));
const keys: Keys = {
  kid: state.kid,
  privateKey: createPrivateKey(state.privateKeyPem),
  jwks: state.jwks,
};

type User = { id: string; token: string };
const user = (email: string, overrides: Record<string, unknown> = {}): User => {
  const id = randomUUID();
  return { id, token: signJwt(keys, { ...idTokenClaims(id, email, CLIENT_ID), ...overrides }) };
};

async function api(u: User | null, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(u ? { Authorization: `Bearer ${u.token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const rpc = (u: User | null, fn: string, args: object = {}) =>
  api(u, `/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });

const coach = user('coach@example.com');
const athlete = user('henry@example.com');
const stranger = user('stranger@example.com');

describe('AWS data tier', () => {
  before(async () => {
    for (const u of [coach, athlete, stranger]) {
      assert.equal((await rpc(u, 'ensure_my_account')).status, 204);
    }
  });

  it('creates a profile for each Cognito user on first sign-in, once', async () => {
    assert.equal((await rpc(athlete, 'ensure_my_account')).status, 204);
    const res = await api(athlete, '/profiles?select=id');
    assert.deepEqual(res.body, [{ id: athlete.id }]);
  });

  it('rejects anonymous, tampered, expired, and wrong-audience tokens', async () => {
    // The app's migrations revoke table access from signed-out users entirely.
    const anonymous = await api(null, '/weigh_ins');
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.code, '42501');
    const tampered = { ...athlete, token: athlete.token.slice(0, -4) + 'AAAA' };
    assert.equal((await api(tampered, '/weigh_ins')).status, 401);
    const expired = user('old@example.com', { exp: Math.floor(Date.now() / 1000) - 60 });
    assert.equal((await api(expired, '/weigh_ins')).status, 401);
    const wrongAud = user('aud@example.com', { aud: 'some-other-app' });
    assert.equal((await api(wrongAud, '/weigh_ins')).status, 401);
  });

  it('keeps each user to their own rows', async () => {
    const created = await api(athlete, '/weigh_ins', {
      method: 'POST',
      body: JSON.stringify({ weight: 162.4, kind: 'morning' }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body[0].user_id, athlete.id);
    await api(athlete, '/food_logs', {
      method: 'POST',
      body: JSON.stringify({ meal: 'lunch', name: 'Burrito', calories: 900 }),
    });
    assert.equal((await api(stranger, '/weigh_ins')).body.length, 0);
    const spoof = await api(stranger, '/weigh_ins', {
      method: 'POST',
      body: JSON.stringify({ weight: 100, kind: 'morning', user_id: athlete.id }),
    });
    assert.equal(spoof.status, 403);
  });

  it('runs coach mode: join by code, read-only roster access, no food, leave', async () => {
    const team = await api(coach, '/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'Central High' }),
    });
    assert.equal(team.status, 201);
    const code: string = team.body[0].join_code;
    assert.match(code, /^[A-Z2-9]{8}$/);

    const preview = await rpc(athlete, 'preview_team', {
      code: `${code.slice(0, 4).toLowerCase()}-${code.slice(4)}`,
    });
    assert.equal(preview.body[0].team_name, 'Central High');
    assert.equal((await rpc(athlete, 'join_team', { code })).status, 200);

    const seen = await api(coach, `/weigh_ins?user_id=eq.${athlete.id}`);
    assert.equal(seen.body.length, 1);
    assert.equal((await api(coach, `/food_logs?user_id=eq.${athlete.id}`)).body.length, 0);
    const edit = await api(coach, `/weigh_ins?user_id=eq.${athlete.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ weight: 100 }),
    });
    assert.deepEqual(edit.body, []);
    const roster = await rpc(coach, 'team_roster', { team: team.body[0].id });
    assert.equal(roster.body.length, 1);
    assert.equal(roster.body[0].user_id, athlete.id);
    assert.equal((await rpc(stranger, 'team_roster', { team: team.body[0].id })).status, 403);

    await api(athlete, `/team_members?team_id=eq.${team.body[0].id}&user_id=eq.${athlete.id}`, {
      method: 'DELETE',
    });
    assert.equal((await api(coach, `/weigh_ins?user_id=eq.${athlete.id}`)).body.length, 0);
  });

  it('converts units and deletes accounts through the existing functions', async () => {
    assert.equal((await rpc(athlete, 'convert_weight_unit', { target: 'kg' })).status, 204);
    const w = await api(athlete, '/weigh_ins?select=weight');
    assert.equal(w.body[0].weight, 73.7);

    assert.equal((await rpc(athlete, 'delete_my_account')).status, 204);
    assert.deepEqual((await api(athlete, '/profiles')).body, []);
    assert.deepEqual((await api(athlete, '/weigh_ins')).body, []);
  });
});

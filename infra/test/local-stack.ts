// Runs the AWS data tier locally for testing: plain PostgreSQL 16 (like RDS,
// with a non-superuser master role) and PostgREST verifying RS256 tokens
// against a JWKS (like Cognito). Requires Docker.
//
//   npx tsx test/local-stack.ts up <stateDir>    start everything, apply migrations
//   npx tsx test/local-stack.ts down             stop and remove the containers

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Client } from 'pg';

import { loadSqlFiles } from '../lambda/migrate/files';
import { applyMigrations, setAuthenticatorPassword } from '../lambda/migrate/runner';
import { makeKeys } from './jwt';

const NETWORK = 'matlog-aws';
const DB = 'matlog-aws-db';
const API = 'matlog-aws-api';
export const DB_PORT = 55432;
export const API_PORT = 53000;
export const CLIENT_ID = 'local-test-client';
const MASTER_PASSWORD = 'master-local-pw';
const AUTHENTICATOR_PASSWORD = 'authenticator-local-pw';

const sh = (cmd: string) => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const quiet = (cmd: string) => {
  try {
    sh(cmd);
  } catch {
    // Already gone.
  }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check: () => Promise<boolean>, what: string, tries = 60) {
  for (let i = 0; i < tries; i++) {
    if (await check().catch(() => false)) return;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

export async function up(stateDir: string) {
  down();
  mkdirSync(stateDir, { recursive: true });
  quiet(`docker network create ${NETWORK}`);
  sh(
    `docker run -d --name ${DB} --network ${NETWORK} -p ${DB_PORT}:5432 ` +
      `-e POSTGRES_PASSWORD=superuser-pw postgres:16-alpine`,
  );
  const superUrl = `postgres://postgres:superuser-pw@localhost:${DB_PORT}/postgres`;
  await waitFor(async () => {
    const c = new Client(superUrl);
    await c.connect();
    await c.end();
    return true;
  }, 'Postgres');

  // Like RDS: the app's master user can create roles and databases but is not a superuser.
  const admin = new Client(superUrl);
  await admin.connect();
  await admin.query(`create role master login createrole createdb password '${MASTER_PASSWORD}'`);
  await admin.query('create database matlog owner master');
  await admin.end();

  const master = new Client(`postgres://master:${MASTER_PASSWORD}@localhost:${DB_PORT}/matlog`);
  await master.connect();
  const repo = resolve(__dirname, '..', '..');
  const applied = await applyMigrations(
    master,
    loadSqlFiles(join(repo, 'infra', 'sql'), join(repo, 'supabase', 'migrations')),
    (m) => console.log(m),
  );
  await setAuthenticatorPassword(master, AUTHENTICATOR_PASSWORD);
  await master.end();
  console.log(`Applied ${applied.length} files`);

  const keys = makeKeys();
  writeFileSync(
    join(stateDir, 'keys.json'),
    JSON.stringify({
      kid: keys.kid,
      privateKeyPem: keys.privateKey.export({ format: 'pem', type: 'pkcs8' }),
      jwks: keys.jwks,
    }),
  );
  writeFileSync(join(stateDir, 'jwks.json'), JSON.stringify(keys.jwks));

  sh(
    `docker run -d --name ${API} --network ${NETWORK} -p ${API_PORT}:3000 ` +
      `-e PGRST_DB_URI=postgres://authenticator:${AUTHENTICATOR_PASSWORD}@${DB}:5432/matlog ` +
      `-e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon ` +
      `-e PGRST_JWT_AUD=${CLIENT_ID} ` +
      `-e PGRST_JWT_SECRET='${JSON.stringify(keys.jwks)}' ` +
      `postgrest/postgrest:v12.2.3`,
  );
  await waitFor(async () => (await fetch(`http://localhost:${API_PORT}/`)).ok, 'PostgREST');
  console.log(`PostgREST on http://localhost:${API_PORT}, Postgres on ${DB_PORT}`);
}

export function down() {
  quiet(`docker rm -f ${API}`);
  quiet(`docker rm -f ${DB}`);
}

if (require.main === module) {
  const [cmd, dir] = process.argv.slice(2);
  if (cmd === 'up') {
    up(dir ?? '/tmp/matlog-aws').catch((e) => {
      console.error(e);
      process.exit(1);
    });
  } else if (cmd === 'down') {
    down();
  } else {
    console.error('Usage: local-stack.ts up <stateDir> | down');
    process.exit(1);
  }
}

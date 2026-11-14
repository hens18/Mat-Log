// Applies Mat Log's SQL to a PostgreSQL database in order, once each:
//   1. infra/sql/00_*.sql        Supabase compatibility (roles, auth schema)
//   2. supabase/migrations/*.sql the app's schema, unchanged
//   3. infra/sql/90_*.sql        AWS-only additions
// Each file runs in its own transaction and is recorded in
// meta.applied_migrations, so re-running only applies new files.

import type { Client } from 'pg';

export type SqlFile = { name: string; sql: string };

export async function applyMigrations(
  client: Client,
  files: SqlFile[],
  log: (message: string) => void = () => {},
): Promise<string[]> {
  await client.query('create schema if not exists meta');
  await client.query(`create table if not exists meta.applied_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  const { rows } = await client.query<{ name: string }>('select name from meta.applied_migrations');
  const done = new Set(rows.map((r) => r.name));
  const applied: string[] = [];

  for (const file of files) {
    if (done.has(file.name)) continue;
    log(`Applying ${file.name}`);
    await client.query('begin');
    try {
      await client.query(file.sql);
      await client.query('insert into meta.applied_migrations (name) values ($1)', [file.name]);
      await client.query('commit');
      applied.push(file.name);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`${file.name} failed: ${(error as Error).message}`);
    }
  }
  return applied;
}

/** Sets the password PostgREST logs in with (quoted safely as a literal). */
export async function setAuthenticatorPassword(client: Client, password: string): Promise<void> {
  const { rows } = await client.query<{ q: string }>('select quote_literal($1) as q', [password]);
  await client.query(`alter role authenticator with login password ${rows[0].q}`);
}

/** Orders files: compat first, then app migrations by name, then AWS additions. */
export function orderFiles(compat: SqlFile[], app: SqlFile[], aws: SqlFile[]): SqlFile[] {
  const byName = (a: SqlFile, b: SqlFile) => a.name.localeCompare(b.name);
  return [...compat.sort(byName), ...app.sort(byName), ...aws.sort(byName)];
}

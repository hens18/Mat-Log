// Runs inside the VPC next to the database: applies any new SQL and keeps the
// PostgREST login's password in step with Secrets Manager. It has no route to
// Secrets Manager itself; lambda/migrate-start passes the credentials in.

import { Client } from 'pg';

import { applyMigrations, setAuthenticatorPassword } from './runner';
import { SQL_FILES } from './sql.generated';

export type MigrateEvent = {
  master: { username: string; password: string; host: string; port: number; dbname: string };
  authenticatorPassword: string;
};

export async function handler(event: MigrateEvent): Promise<{ applied: string[] }> {
  const { master } = event;
  const client = new Client({
    host: master.host,
    port: master.port,
    user: master.username,
    password: master.password,
    database: master.dbname,
    // RDS requires TLS. Traffic stays inside the VPC, so the certificate is not pinned here.
    ssl: { rejectUnauthorized: false },
    // A paused Aurora database can take a while to accept the first connection.
    connectionTimeoutMillis: 60_000,
  });
  await client.connect();
  try {
    const applied = await applyMigrations(client, SQL_FILES, (m) => console.log(m));
    await setAuthenticatorPassword(client, event.authenticatorPassword);
    console.log(`Applied ${applied.length} new SQL files`);
    return { applied };
  } finally {
    await client.end();
  }
}

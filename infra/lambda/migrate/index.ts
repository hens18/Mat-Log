// Runs on every deploy (a CDK Trigger): applies any new SQL to RDS and keeps
// the PostgREST login's password in step with Secrets Manager.

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

import { applyMigrations, setAuthenticatorPassword } from './runner';
import { SQL_FILES } from './sql.generated';

const secrets = new SecretsManagerClient({});

async function secretString(arn: string): Promise<string> {
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!result.SecretString) throw new Error(`Secret ${arn} is empty`);
  return result.SecretString;
}

export async function handler(): Promise<{ applied: string[] }> {
  const master = JSON.parse(await secretString(process.env.MASTER_SECRET_ARN!)) as {
    username: string;
    password: string;
    host: string;
    port: number;
    dbname: string;
  };
  const client = new Client({
    host: master.host,
    port: master.port,
    user: master.username,
    password: master.password,
    database: master.dbname,
    // RDS requires TLS. Traffic stays inside the VPC, so the certificate is not pinned here.
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const applied = await applyMigrations(client, SQL_FILES, (m) => console.log(m));
    await setAuthenticatorPassword(client, await secretString(process.env.AUTHENTICATOR_SECRET_ARN!));
    console.log(`Applied ${applied.length} new SQL files`);
    return { applied };
  } finally {
    await client.end();
  }
}

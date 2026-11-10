// Runs outside the VPC, where it can reach Secrets Manager directly, then
// hands the database credentials to the migration Lambda inside the VPC.
// This avoids a Secrets Manager VPC endpoint (about $7 a month) for a job
// that runs once per deploy.

import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const secrets = new SecretsManagerClient({});
const lambda = new LambdaClient({});

async function secretString(arn: string): Promise<string> {
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!result.SecretString) throw new Error(`Secret ${arn} is empty`);
  return result.SecretString;
}

export async function handler(): Promise<unknown> {
  const payload = {
    master: JSON.parse(await secretString(process.env.MASTER_SECRET_ARN!)),
    authenticatorPassword: await secretString(process.env.AUTHENTICATOR_SECRET_ARN!),
  };
  const result = await lambda.send(
    new InvokeCommand({
      FunctionName: process.env.RUNNER_FUNCTION_NAME!,
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );
  const output = result.Payload ? JSON.parse(Buffer.from(result.Payload).toString()) : null;
  if (result.FunctionError) {
    throw new Error(`Migrations failed: ${output?.errorMessage ?? result.FunctionError}`);
  }
  console.log('Migrations done', JSON.stringify(output));
  return output;
}

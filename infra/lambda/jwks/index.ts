// CloudFormation custom resource: fetches the user pool's public signing keys
// (JWKS) so PostgREST can verify Cognito tokens without calling out at runtime.

import type { CloudFormationCustomResourceEvent } from 'aws-lambda';

export async function handler(event: CloudFormationCustomResourceEvent) {
  const url = event.ResourceProperties.JwksUrl as string;
  if (event.RequestType === 'Delete') return { PhysicalResourceId: url };
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetching ${url} failed with ${response.status}`);
  const jwks = (await response.json()) as { keys: unknown[] };
  if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) throw new Error('JWKS has no keys');
  return { PhysicalResourceId: url, Data: { Jwks: JSON.stringify(jwks) } };
}

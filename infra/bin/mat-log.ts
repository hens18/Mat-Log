#!/usr/bin/env node
// CDK entry point. Deploys to the account and region your AWS CLI is set up for.
//   npx cdk deploy                                  deploy or update (always-on free-tier RDS)
//   npx cdk deploy -c database=aurora               use Aurora that pauses when idle instead
//   npx cdk deploy -c alertEmail=you@example.com    email you as spend nears the budget
//   npx cdk deploy -c web=false                     skip building and hosting the web app
//                                                   (removes the site if it was deployed)

import { join } from 'node:path';

import { App } from 'aws-cdk-lib';

import { ensurePostgrestAsset } from '../lib/postgrest-asset';
import { MatLogStack, type DatabaseKind } from '../lib/mat-log-stack';
import { buildWeb } from '../lib/web-build';

async function main() {
  const app = new App();
  const budget = app.node.tryGetContext('monthlyBudgetUsd');
  const database = (app.node.tryGetContext('database') ?? 'rds') as DatabaseKind;
  if (database !== 'rds' && database !== 'aurora') {
    throw new Error(`database must be "rds" or "aurora", not "${database}"`);
  }
  const web = String(app.node.tryGetContext('web') ?? 'true') !== 'false';

  new MatLogStack(app, 'MatLogStack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
    },
    description: 'Mat Log: Cognito, PostgREST in Lambda, API Gateway, PostgreSQL, CloudFront',
    postgrestAssetDir: await ensurePostgrestAsset(),
    database,
    alertEmail: app.node.tryGetContext('alertEmail'),
    monthlyBudgetUsd: budget ? Number(budget) : undefined,
    webDir: web ? buildWeb(join(__dirname, '..', '..')) : undefined,
  });
  app.synth();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

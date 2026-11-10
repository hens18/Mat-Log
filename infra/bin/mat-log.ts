#!/usr/bin/env node
// CDK entry point. Deploys to the account and region your AWS CLI is set up for.
//   npx cdk deploy                                  deploy or update
//   npx cdk deploy -c alertEmail=you@example.com    also email you if spend nears the budget

import { App } from 'aws-cdk-lib';

import { MatLogStack } from '../lib/mat-log-stack';

const app = new App();
const budget = app.node.tryGetContext('monthlyBudgetUsd');

new MatLogStack(app, 'MatLogStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Mat Log: Cognito, PostgREST on Fargate, API Gateway, RDS PostgreSQL',
  alertEmail: app.node.tryGetContext('alertEmail'),
  monthlyBudgetUsd: budget ? Number(budget) : undefined,
});

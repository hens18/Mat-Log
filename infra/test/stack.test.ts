// Locks in the security- and cost-critical settings of the AWS stack.

import { describe, it } from 'node:test';

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { MatLogStack, type DatabaseKind } from '../lib/mat-log-stack';

// Stand-in for the downloaded PostgREST binary; the tests only need a folder to package.
const assetDir = mkdtempSync(join(tmpdir(), 'postgrest-asset-'));
mkdirSync(assetDir, { recursive: true });
writeFileSync(join(assetDir, 'index.mjs'), 'export const handler = () => {};');
writeFileSync(join(assetDir, 'postgrest'), 'binary');

function synth(alertEmail?: string, database: DatabaseKind = 'rds') {
  const app = new App({
    context: {
      'availability-zones:account=123456789012:region=us-east-1': ['us-east-1a', 'us-east-1b'],
    },
  });
  const stack = new MatLogStack(app, 'Test', {
    env: { account: '123456789012', region: 'us-east-1' },
    postgrestAssetDir: assetDir,
    database,
    alertEmail,
  });
  return Template.fromStack(stack);
}

describe('MatLogStack', () => {
  const template = synth('coach@example.com');

  it('keeps the database private, encrypted, backed up, and protected', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      PubliclyAccessible: false,
      StorageEncrypted: true,
      BackupRetentionPeriod: 7,
      // Free-tier shape: db.t4g.micro, single AZ, 20 GB.
      DBInstanceClass: 'db.t4g.micro',
      MultiAZ: false,
      AllocatedStorage: '20',
      Engine: 'postgres',
    });
    template.hasResource('AWS::RDS::DBInstance', { DeletionPolicy: 'Snapshot' });
  });

  it('only lets PostgREST and the migration Lambda reach the database', () => {
    const rules = template.findResources('AWS::EC2::SecurityGroupIngress', {
      Properties: { FromPort: 5432 },
    });
    if (Object.keys(rules).length !== 2)
      throw new Error(`Expected 2 rules on 5432, got ${Object.keys(rules).length}`);
    template.resourcePropertiesCountIs(
      'AWS::EC2::SecurityGroup',
      { SecurityGroupIngress: Match.arrayWith([Match.objectLike({ CidrIp: '0.0.0.0/0' })]) },
      0,
    );
  });

  it('has nothing that bills by the hour except the database (cost)', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0);
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
    template.resourceCountIs('AWS::EC2::EIP', 0);
    template.resourceCountIs('AWS::ECS::Service', 0);
    template.resourceCountIs('AWS::ApiGatewayV2::VpcLink', 0);
  });

  it('configures Cognito sign-in to match the app', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: { PasswordPolicy: Match.objectLike({ MinimumLength: 8, RequireNumbers: true }) },
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
      LambdaConfig: Match.objectLike({ PreTokenGeneration: Match.anyValue() }),
    });
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      GenerateSecret: false,
      ExplicitAuthFlows: Match.arrayWith(['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH']),
      PreventUserExistenceErrors: 'ENABLED',
      EnableTokenRevocation: true,
    });
  });

  it('runs PostgREST in a VPC Lambda with token verification and no public schema docs', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs22.x',
      Architectures: ['x86_64'],
      VpcConfig: Match.anyValue(),
      Environment: {
        Variables: Match.objectLike({
          PGRST_DB_ANON_ROLE: 'anon',
          PGRST_OPENAPI_MODE: 'disabled',
          PGRST_JWT_AUD: Match.anyValue(),
          PGRST_JWT_SECRET: Match.anyValue(),
          PGRST_DB_URI: Match.anyValue(),
        }),
      },
    });
  });

  it('migrates through a VPC Lambda fed by one outside the VPC', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          MASTER_SECRET_ARN: Match.anyValue(),
          RUNNER_FUNCTION_NAME: Match.anyValue(),
          SQL_HASH: Match.stringLikeRegexp('^[0-9a-f]{16}$'),
        }),
      },
    });
    template.resourceCountIs('Custom::Trigger', 1);
  });

  it('can use Aurora Serverless v2 that pauses itself instead', () => {
    const aurora = synth(undefined, 'aurora');
    aurora.resourceCountIs('AWS::RDS::DBInstance', 1);
    aurora.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      StorageEncrypted: true,
      ServerlessV2ScalingConfiguration: Match.objectLike({ MinCapacity: 0, MaxCapacity: 1 }),
    });
    aurora.hasResourceProperties('AWS::RDS::DBInstance', { DBInstanceClass: 'db.serverless' });
  });

  it('throttles the API and routes /rest/v1 to PostgREST', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      DefaultRouteSettings: { ThrottlingRateLimit: 50, ThrottlingBurstLimit: 100 },
    });
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'ANY /rest/v1/{proxy+}',
    });
  });

  it('adds a budget alert only when an email is given', () => {
    template.resourceCountIs('AWS::Budgets::Budget', 1);
    template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({ BudgetLimit: { Amount: 50, Unit: 'USD' }, TimeUnit: 'MONTHLY' }),
      NotificationsWithSubscribers: [
        Match.objectLike({
          Notification: Match.objectLike({ NotificationType: 'ACTUAL', Threshold: 50 }),
        }),
        Match.objectLike({
          Notification: Match.objectLike({ NotificationType: 'ACTUAL', Threshold: 80 }),
        }),
        Match.objectLike({
          Notification: Match.objectLike({ NotificationType: 'ACTUAL', Threshold: 100 }),
        }),
        Match.objectLike({
          Notification: Match.objectLike({ NotificationType: 'FORECASTED', Threshold: 100 }),
        }),
      ],
    });
    synth().resourceCountIs('AWS::Budgets::Budget', 0);
  });
});

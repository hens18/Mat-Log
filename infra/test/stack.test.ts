// Locks in the security- and cost-critical settings of the AWS stack.

import { describe, it } from 'node:test';

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { MatLogStack } from '../lib/mat-log-stack';

function synth(alertEmail?: string) {
  const app = new App({
    context: {
      'availability-zones:account=123456789012:region=us-east-1': ['us-east-1a', 'us-east-1b'],
    },
  });
  const stack = new MatLogStack(app, 'Test', {
    env: { account: '123456789012', region: 'us-east-1' },
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
      DeletionProtection: true,
      BackupRetentionPeriod: 7,
      DBInstanceClass: 'db.t4g.micro',
      Engine: 'postgres',
    });
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

  it('has no NAT gateway or load balancer (cost)', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0);
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

  it('runs PostgREST with token verification, the anon role, and no public schema docs', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        Match.objectLike({
          Image: 'postgrest/postgrest:v12.2.3',
          Environment: Match.arrayWith([
            // arrayWith matches in order.
            { Name: 'PGRST_DB_ANON_ROLE', Value: 'anon' },
            Match.objectLike({ Name: 'PGRST_JWT_SECRET' }),
            Match.objectLike({ Name: 'PGRST_JWT_AUD' }),
            { Name: 'PGRST_OPENAPI_MODE', Value: 'disabled' },
          ]),
          Secrets: [Match.objectLike({ Name: 'PGPASSWORD' })],
        }),
      ],
    });
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

// Mat Log on AWS. Everything the app needs, in one stack:
//
//   App ──HTTPS──▶ API Gateway (HTTP API) ──VPC link──▶ PostgREST on ECS Fargate ──▶ RDS PostgreSQL
//    │                                                     ▲ verifies Cognito tokens (JWKS)
//    └──HTTPS──▶ Cognito (sign up, sign in, reset)  ───────┘
//
// The database keeps every privacy rule from supabase/migrations, applied by
// a migration Lambda on each deploy. Costs are kept low on purpose: no NAT
// gateway or load balancer, one small Fargate task, a single-AZ db.t4g.micro.

import { join } from 'node:path';

import {
  CfnOutput,
  CustomResource,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
  aws_apigatewayv2 as apigw,
  aws_apigatewayv2_integrations as integrations,
  aws_budgets as budgets,
  aws_cognito as cognito,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_logs as logs,
  aws_rds as rds,
  aws_secretsmanager as secretsmanager,
  aws_servicediscovery as servicediscovery,
  custom_resources as cr,
  triggers,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

import { writeSqlBundle } from './sql-bundle';

const POSTGREST_IMAGE = 'postgrest/postgrest:v12.2.3';
const DB_NAME = 'matlog';

export type MatLogStackProps = StackProps & {
  /** Email for the monthly budget alert. Optional. */
  alertEmail?: string;
  /** Monthly budget in USD for the alert. */
  monthlyBudgetUsd?: number;
};

export class MatLogStack extends Stack {
  constructor(scope: Construct, id: string, props: MatLogStackProps = {}) {
    super(scope, id, props);
    const repoRoot = join(__dirname, '..', '..');
    const lambdaDir = join(__dirname, '..', 'lambda');

    // -------------------------------------------------------------------
    // Network: public subnets for the API task (no NAT gateway needed),
    // isolated subnets for the database and the migration Lambda.
    // -------------------------------------------------------------------
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });
    const isolated = { subnetType: ec2.SubnetType.PRIVATE_ISOLATED };
    const logGroup = (id: string) =>
      new logs.LogGroup(this, id, {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      });

    // The migration Lambda reads secrets from inside the isolated subnets.
    vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      // One AZ is enough for a once-per-deploy Lambda and halves the endpoint cost.
      subnets: { subnets: [vpc.isolatedSubnets[0]] },
    });

    const apiSg = new ec2.SecurityGroup(this, 'ApiSg', { vpc, description: 'PostgREST tasks' });
    const migrateSg = new ec2.SecurityGroup(this, 'MigrateSg', { vpc, description: 'Migration Lambda' });
    const vpcLinkSg = new ec2.SecurityGroup(this, 'VpcLinkSg', { vpc, description: 'API Gateway VPC link' });
    const dbSg = new ec2.SecurityGroup(this, 'DbSg', {
      vpc,
      description: 'RDS PostgreSQL',
      allowAllOutbound: false,
    });
    dbSg.addIngressRule(apiSg, ec2.Port.tcp(5432), 'PostgREST');
    dbSg.addIngressRule(migrateSg, ec2.Port.tcp(5432), 'Migrations');
    apiSg.addIngressRule(vpcLinkSg, ec2.Port.tcp(3000), 'API Gateway');

    // -------------------------------------------------------------------
    // Database
    // -------------------------------------------------------------------
    const db = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: isolated,
      securityGroups: [dbSg],
      databaseName: DB_NAME,
      credentials: rds.Credentials.fromGeneratedSecret('master'),
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      multiAz: false,
      publiclyAccessible: false,
      backupRetention: Duration.days(7),
      deletionProtection: true,
      // Keep a final snapshot if the stack is ever destroyed.
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    // PostgREST logs in as "authenticator" with this password.
    const authenticatorSecret = new secretsmanager.Secret(this, 'AuthenticatorPassword', {
      description: 'Password for the PostgREST authenticator database role',
      generateSecretString: { excludePunctuation: true, passwordLength: 40 },
    });

    // -------------------------------------------------------------------
    // Migrations: applied on every deploy, after the database exists.
    // -------------------------------------------------------------------
    writeSqlBundle(repoRoot);
    const migrateFn = new nodejs.NodejsFunction(this, 'MigrateFunction', {
      entry: join(lambdaDir, 'migrate', 'index.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.minutes(5),
      memorySize: 512,
      vpc,
      vpcSubnets: isolated,
      securityGroups: [migrateSg],
      environment: {
        MASTER_SECRET_ARN: db.secret!.secretArn,
        AUTHENTICATOR_SECRET_ARN: authenticatorSecret.secretArn,
      },
      logGroup: logGroup('MigrateLogs'),
      bundling: { externalModules: ['@aws-sdk/*', 'pg-native'] },
    });
    db.secret!.grantRead(migrateFn);
    authenticatorSecret.grantRead(migrateFn);
    const migrate = new triggers.Trigger(this, 'RunMigrations', {
      handler: migrateFn,
      executeOnHandlerChange: true,
      timeout: Duration.minutes(5),
    });
    migrate.executeAfter(db);

    // -------------------------------------------------------------------
    // Sign-in: Cognito user pool with email + password.
    // -------------------------------------------------------------------
    const preTokenFn = new nodejs.NodejsFunction(this, 'PreTokenFunction', {
      entry: join(lambdaDir, 'pre-token', 'index.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      logGroup: logGroup('PreTokenLogs'),
    });

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'mat-log-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      // Matches the app's check: 8+ characters with a number (and a letter, checked in the app).
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: false,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      featurePlan: cognito.FeaturePlan.LITE,
      lambdaTriggers: { preTokenGeneration: preTokenFn },
      userVerification: {
        emailSubject: 'Your Mat Log code',
        emailBody: 'Your Mat Log confirmation code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      // Never lose accounts by accident.
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const appClient = userPool.addClient('AppClient', {
      userPoolClientName: 'mat-log-app',
      generateSecret: false,
      authFlows: { userPassword: true },
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      idTokenValidity: Duration.hours(1),
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });

    // PostgREST verifies tokens against the pool's public keys, fetched once at deploy.
    const jwksFn = new nodejs.NodejsFunction(this, 'JwksFunction', {
      entry: join(lambdaDir, 'jwks', 'index.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(30),
      logGroup: logGroup('JwksLogs'),
    });
    const jwks = new CustomResource(this, 'UserPoolJwks', {
      serviceToken: new cr.Provider(this, 'JwksProvider', {
        onEventHandler: jwksFn,
        logGroup: logGroup('JwksProviderLogs'),
      }).serviceToken,
      properties: {
        JwksUrl: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/jwks.json`,
      },
    });

    // -------------------------------------------------------------------
    // API: PostgREST on Fargate, registered in Cloud Map for API Gateway.
    // -------------------------------------------------------------------
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      defaultCloudMapNamespace: { name: 'matlog.internal', vpc },
    });

    const taskDef = new ecs.FargateTaskDefinition(this, 'PostgrestTask', {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });
    taskDef.addContainer('postgrest', {
      image: ecs.ContainerImage.fromRegistry(POSTGREST_IMAGE),
      portMappings: [{ containerPort: 3000, name: 'http' }],
      environment: {
        // libpq fills in the password from PGPASSWORD; RDS requires TLS.
        PGRST_DB_URI: `postgres://authenticator@${db.dbInstanceEndpointAddress}:${db.dbInstanceEndpointPort}/${DB_NAME}?sslmode=require`,
        PGRST_DB_SCHEMAS: 'public',
        PGRST_DB_ANON_ROLE: 'anon',
        PGRST_JWT_SECRET: jwks.getAttString('Jwks'),
        PGRST_JWT_AUD: appClient.userPoolClientId,
        // Don't publish the schema to anyone who asks.
        PGRST_OPENAPI_MODE: 'disabled',
        PGRST_DB_POOL: '10',
        PGRST_LOG_LEVEL: 'warn',
      },
      secrets: { PGPASSWORD: ecs.Secret.fromSecretsManager(authenticatorSecret) },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'postgrest', logGroup: logGroup('PostgrestLogs') }),
    });

    const service = new ecs.FargateService(this, 'PostgrestService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      // Public subnet with a public IP lets the task pull its image without a NAT gateway.
      // Its security group only accepts traffic from the API Gateway VPC link.
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [apiSg],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      cloudMapOptions: {
        name: 'postgrest',
        dnsRecordType: servicediscovery.DnsRecordType.SRV,
        containerPort: 3000,
      },
    });
    // Start the API only after migrations have created the roles it logs in with.
    service.node.addDependency(migrate);

    const vpcLink = new apigw.VpcLink(this, 'VpcLink', {
      vpc,
      subnets: isolated,
      securityGroups: [vpcLinkSg],
    });
    const httpApi = new apigw.HttpApi(this, 'HttpApi', {
      apiName: 'mat-log-api',
      description: 'Mat Log data API (PostgREST)',
    });
    httpApi.addRoutes({
      path: '/rest/v1/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: new integrations.HttpServiceDiscoveryIntegration(
        'Postgrest',
        service.cloudMapService!,
        {
          vpcLink,
          // supabase-js calls /rest/v1/<table>; PostgREST serves /<table>.
          parameterMapping: new apigw.ParameterMapping().overwritePath(
            apigw.MappingValue.custom('/$request.path.proxy'),
          ),
        },
      ),
    });
    // Cap request rates so a bug or abuse can't run up the bill.
    const stage = httpApi.defaultStage!.node.defaultChild as apigw.CfnStage;
    stage.defaultRouteSettings = { throttlingRateLimit: 50, throttlingBurstLimit: 100 };

    // -------------------------------------------------------------------
    // Cost guardrail
    // -------------------------------------------------------------------
    if (props.alertEmail) {
      new budgets.CfnBudget(this, 'MonthlyBudget', {
        budget: {
          budgetName: 'mat-log-monthly',
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: { amount: props.monthlyBudgetUsd ?? 50, unit: 'USD' },
        },
        notificationsWithSubscribers: [80, 100].map((threshold) => ({
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: props.alertEmail! }],
        })),
      });
    }

    // -------------------------------------------------------------------
    // Values for the app's .env
    // -------------------------------------------------------------------
    new CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint, description: 'EXPO_PUBLIC_API_URL' });
    new CfnOutput(this, 'Region', { value: this.region, description: 'EXPO_PUBLIC_COGNITO_REGION' });
    new CfnOutput(this, 'UserPoolClientId', {
      value: appClient.userPoolClientId,
      description: 'EXPO_PUBLIC_COGNITO_CLIENT_ID',
    });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'DatabaseEndpoint', { value: db.dbInstanceEndpointAddress });
  }
}

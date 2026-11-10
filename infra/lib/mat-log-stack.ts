// Mat Log on AWS. Everything the app needs, in one stack:
//
//   App ──HTTPS──▶ API Gateway (HTTP API) ──▶ PostgREST in Lambda ──▶ PostgreSQL (RDS or Aurora)
//    │                                          ▲ verifies Cognito tokens (JWKS)
//    └──HTTPS──▶ Cognito (sign up, sign in, reset) ┘
//
// The database keeps every privacy rule from supabase/migrations, applied on
// each deploy. Built to cost close to nothing: the API only runs per request
// (Lambda), there's no NAT gateway, load balancer, VPC endpoint, or public IP,
// and the database is either a free-tier db.t4g.micro or Aurora Serverless v2
// that pauses itself when idle.

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
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_logs as logs,
  aws_rds as rds,
  aws_secretsmanager as secretsmanager,
  custom_resources as cr,
  triggers,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

import { writeSqlBundle } from './sql-bundle';

const DB_NAME = 'matlog';

export type DatabaseKind = 'rds' | 'aurora';

export type MatLogStackProps = StackProps & {
  /** Folder with the PostgREST binary and lambda/postgrest/index.mjs (see postgrest-asset.ts). */
  postgrestAssetDir: string;
  /**
   * 'rds': an always-on db.t4g.micro (free for 12 months on the AWS free tier).
   * 'aurora': Aurora Serverless v2 that pauses after 5 idle minutes (pennies, but
   * the first request after a pause waits about 15 seconds).
   */
  database?: DatabaseKind;
  /** Email for the monthly budget alert. Optional. */
  alertEmail?: string;
  /** Monthly budget in USD for the alert. */
  monthlyBudgetUsd?: number;
};

export class MatLogStack extends Stack {
  constructor(scope: Construct, id: string, props: MatLogStackProps) {
    super(scope, id, props);
    const repoRoot = join(__dirname, '..', '..');
    const lambdaDir = join(__dirname, '..', 'lambda');

    // -------------------------------------------------------------------
    // Network: the database and the Lambdas that talk to it live in isolated
    // subnets with no internet route at all. (The empty public subnets cost
    // nothing; they're kept so the database never has to be replaced.)
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

    // Description kept from the first deploy: changing it would force AWS to replace the group.
    const apiSg = new ec2.SecurityGroup(this, 'ApiSg', { vpc, description: 'PostgREST tasks' });
    const migrateSg = new ec2.SecurityGroup(this, 'MigrateSg', {
      vpc,
      description: 'Migration Lambda',
    });
    const dbSg = new ec2.SecurityGroup(this, 'DbSg', {
      vpc,
      description: 'RDS PostgreSQL',
      allowAllOutbound: false,
    });
    dbSg.addIngressRule(apiSg, ec2.Port.tcp(5432), 'PostgREST');
    dbSg.addIngressRule(migrateSg, ec2.Port.tcp(5432), 'Migrations');

    // -------------------------------------------------------------------
    // Database
    // -------------------------------------------------------------------
    const databaseKind: DatabaseKind = props.database ?? 'rds';
    let dbHost: string;
    let dbPort: string;
    let dbSecret: secretsmanager.ISecret;
    let dbConstruct: Construct;

    if (databaseKind === 'aurora') {
      const cluster = new rds.DatabaseCluster(this, 'AuroraDatabase', {
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_16_6,
        }),
        writer: rds.ClusterInstance.serverlessV2('writer'),
        // 0 ACU means it pauses itself after the idle period below and costs nothing but storage.
        serverlessV2MinCapacity: 0,
        serverlessV2MaxCapacity: 1,
        serverlessV2AutoPauseDuration: Duration.minutes(5),
        vpc,
        vpcSubnets: isolated,
        securityGroups: [dbSg],
        defaultDatabaseName: DB_NAME,
        credentials: rds.Credentials.fromGeneratedSecret('master'),
        storageEncrypted: true,
        backup: { retention: Duration.days(7) },
        removalPolicy: RemovalPolicy.SNAPSHOT,
      });
      dbHost = cluster.clusterEndpoint.hostname;
      dbPort = String(cluster.clusterEndpoint.port);
      dbSecret = cluster.secret!;
      dbConstruct = cluster;
    } else {
      const instance = new rds.DatabaseInstance(this, 'Database', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE4_GRAVITON,
          ec2.InstanceSize.MICRO,
        ),
        vpc,
        vpcSubnets: isolated,
        securityGroups: [dbSg],
        databaseName: DB_NAME,
        credentials: rds.Credentials.fromGeneratedSecret('master'),
        // 20 GB is the free-tier storage allowance. (Unchanged from the first deploy, so
        // updating the stack never has to modify the existing database's storage.)
        allocatedStorage: 20,
        maxAllocatedStorage: 50,
        storageType: rds.StorageType.GP3,
        storageEncrypted: true,
        multiAz: false,
        publiclyAccessible: false,
        backupRetention: Duration.days(7),
        // Off so switching to Aurora later doesn't get stuck; a final snapshot is still kept.
        deletionProtection: false,
        removalPolicy: RemovalPolicy.SNAPSHOT,
      });
      dbHost = instance.dbInstanceEndpointAddress;
      dbPort = instance.dbInstanceEndpointPort;
      dbSecret = instance.secret!;
      dbConstruct = instance;
    }

    // PostgREST logs in as "authenticator" with this password.
    const authenticatorSecret = new secretsmanager.Secret(this, 'AuthenticatorPassword', {
      description: 'Password for the PostgREST authenticator database role',
      generateSecretString: { excludePunctuation: true, passwordLength: 40 },
    });

    // -------------------------------------------------------------------
    // Migrations: applied on every deploy, after the database exists.
    // -------------------------------------------------------------------
    const sqlHash = writeSqlBundle(repoRoot);
    const migrateFn = new nodejs.NodejsFunction(this, 'MigrateFunction', {
      entry: join(lambdaDir, 'migrate', 'index.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.minutes(5),
      memorySize: 512,
      vpc,
      vpcSubnets: isolated,
      securityGroups: [migrateSg],
      logGroup: logGroup('MigrateLogs'),
      bundling: { externalModules: ['@aws-sdk/*', 'pg-native'] },
    });
    // Outside the VPC, so it can read the secrets without a paid VPC endpoint.
    const migrateStartFn = new nodejs.NodejsFunction(this, 'MigrateStartFunction', {
      entry: join(lambdaDir, 'migrate-start', 'index.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.minutes(6),
      environment: {
        MASTER_SECRET_ARN: dbSecret.secretArn,
        AUTHENTICATOR_SECRET_ARN: authenticatorSecret.secretArn,
        RUNNER_FUNCTION_NAME: migrateFn.functionName,
        // Changes whenever the SQL does, which makes the trigger run again.
        SQL_HASH: sqlHash,
      },
      logGroup: logGroup('MigrateStartLogs'),
      bundling: { externalModules: ['@aws-sdk/*'] },
    });
    dbSecret.grantRead(migrateStartFn);
    authenticatorSecret.grantRead(migrateStartFn);
    migrateFn.grantInvoke(migrateStartFn);
    const migrate = new triggers.Trigger(this, 'RunMigrations', {
      handler: migrateStartFn,
      executeOnHandlerChange: true,
      timeout: Duration.minutes(6),
    });
    migrate.executeAfter(dbConstruct);

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
    // API: PostgREST running inside Lambda, behind API Gateway.
    // -------------------------------------------------------------------
    const postgrestFn = new lambda.Function(this, 'PostgrestFunction', {
      code: lambda.Code.fromAsset(props.postgrestAssetDir),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      // The official static PostgREST build is x86-64.
      architecture: lambda.Architecture.X86_64,
      memorySize: 512,
      timeout: Duration.seconds(29),
      vpc,
      vpcSubnets: isolated,
      securityGroups: [apiSg],
      logGroup: logGroup('PostgrestLogs'),
      environment: {
        // RDS requires TLS.
        PGRST_DB_URI: `postgres://authenticator@${dbHost}:${dbPort}/${DB_NAME}?sslmode=require`,
        // Inside the isolated subnets the function can't reach Secrets Manager, so the
        // password is resolved at deploy time. The authenticator role can only act
        // as anon or a verified user, under row-level security.
        PGPASSWORD: authenticatorSecret.secretValue.unsafeUnwrap(),
        PGRST_DB_SCHEMAS: 'public',
        PGRST_DB_ANON_ROLE: 'anon',
        PGRST_JWT_SECRET: jwks.getAttString('Jwks'),
        PGRST_JWT_AUD: appClient.userPoolClientId,
        // Don't publish the schema to anyone who asks.
        PGRST_OPENAPI_MODE: 'disabled',
        // Each Lambda instance handles one request at a time.
        PGRST_DB_POOL: '2',
        PGRST_DB_POOL_ACQUISITION_TIMEOUT: '25',
        PGRST_LOG_LEVEL: 'warn',
      },
    });
    // Start serving only after migrations have created the roles PostgREST logs in with.
    postgrestFn.node.addDependency(migrate);

    const httpApi = new apigw.HttpApi(this, 'HttpApi', {
      apiName: 'mat-log-api',
      description: 'Mat Log data API (PostgREST)',
    });
    httpApi.addRoutes({
      path: '/rest/v1/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('Postgrest', postgrestFn),
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
          // No fixed name: changing the alerts replaces the budget, and AWS creates the
          // new one before deleting the old, so a fixed name would collide.
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: { amount: props.monthlyBudgetUsd ?? 50, unit: 'USD' },
        },
        // Early warning at half, then 80% and 100% of actual spend, plus a heads-up
        // as soon as AWS forecasts the month will go over.
        notificationsWithSubscribers: (
          [
            ['ACTUAL', 50],
            ['ACTUAL', 80],
            ['ACTUAL', 100],
            ['FORECASTED', 100],
          ] as const
        ).map(([notificationType, threshold]) => ({
          notification: {
            notificationType,
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
    new CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'EXPO_PUBLIC_API_URL',
    });
    new CfnOutput(this, 'Region', {
      value: this.region,
      description: 'EXPO_PUBLIC_COGNITO_REGION',
    });
    new CfnOutput(this, 'UserPoolClientId', {
      value: appClient.userPoolClientId,
      description: 'EXPO_PUBLIC_COGNITO_CLIENT_ID',
    });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'DatabaseEndpoint', { value: dbHost });
    new CfnOutput(this, 'DatabaseKind', { value: databaseKind });
  }
}

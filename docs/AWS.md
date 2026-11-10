# Running Mat Log on AWS

Mat Log's backend runs entirely on AWS, defined as code in [`infra/`](../infra) with the AWS CDK. One command creates everything; one command updates it.

```
 App ──HTTPS──▶ API Gateway ──VPC link──▶ PostgREST (ECS Fargate) ──▶ RDS PostgreSQL
  │                                            ▲ checks every request's Cognito token
  └──HTTPS──▶ Amazon Cognito (sign up, sign in, password reset)
```

| Piece | AWS service | What it does |
| --- | --- | --- |
| Database | Amazon RDS for PostgreSQL 16 (db.t4g.micro) | All data. Every row-level security policy from `supabase/migrations` runs unchanged. |
| Sign-in | Amazon Cognito | Email and password accounts, email confirmation codes, password reset codes. |
| API | PostgREST on Amazon ECS Fargate | Turns the database into the REST API the app already used. Verifies each Cognito token, then lets Postgres's row-level security decide what that user can see. |
| Front door | Amazon API Gateway (HTTP API) | The public HTTPS URL, rate limited, connected privately to PostgREST. |
| Migrations | AWS Lambda (runs on each deploy) | Applies any new SQL from `supabase/migrations` and `infra/sql`. |
| Secrets | AWS Secrets Manager | Database passwords. Nothing secret is in the code or the app. |
| Budget | AWS Budgets | Emails you at 50%, 80%, and 100% of a monthly budget, and as soon as AWS forecasts the month will go over. |

## What it costs

Estimated on-demand prices in us-east-1 for a small team. Check the [AWS Pricing Calculator](https://calculator.aws/) for current numbers.

| Item | Per month |
| --- | --- |
| RDS db.t4g.micro, single AZ, 20 GB gp3 | about $14 |
| Fargate task (0.25 vCPU, 0.5 GB, ARM) | about $7 |
| Public IPv4 address for the task | about $3.60 |
| Secrets Manager VPC endpoint (one AZ) | about $7.30 |
| Two Secrets Manager secrets | about $0.80 |
| API Gateway, Lambda, Cognito (up to 10,000 monthly users), logs | about $0 to $1 |
| **Total** | **about $33** |

New AWS accounts often come with free credits that cover the first months. There is deliberately no NAT gateway (about $33/month) and no load balancer (about $16/month).

## One-time setup on Windows

### 1. AWS account

1. Sign up at [aws.amazon.com](https://aws.amazon.com/). Turn on MFA for the root user right away (account menu, **Security credentials**).
2. Don't deploy as the root user. In the console, open **IAM Identity Center**, enable it, create a user for yourself, and give it the **AdministratorAccess** permission set on your account. You'll get a sign-in portal URL by email.

### 2. Tools

In PowerShell:

```powershell
winget install Amazon.AWSCLI
winget install OpenJS.NodeJS.LTS
```

Close and reopen PowerShell, then sign in through IAM Identity Center:

```powershell
aws configure sso
```

Answer with your portal URL and region (for example `us-east-1`), and name the profile `default`. Check it works:

```powershell
aws sts get-caller-identity
```

Next time, `aws sso login` signs you back in.

### 3. Prepare the CDK (once per account and region)

```powershell
cd ~\mat-log\infra
npm install
npx cdk bootstrap
```

## Deploy

```powershell
cd ~\mat-log\infra
npx cdk deploy -c alertEmail=you@example.com
```

Type `y` when it lists the security changes. The first deploy takes about 15 to 20 minutes, mostly creating the database. AWS emails you a link to confirm the budget alert.

At the end it prints:

```
Outputs:
MatLogStack.ApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com
MatLogStack.Region = us-east-1
MatLogStack.UserPoolClientId = 1a2b3c4d5e6f7g8h9i0j
...
```

Put those three into the app's `.env` (copy `.env.example` first):

```
EXPO_PUBLIC_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
```

Then run the app as usual: `npx expo start -c`. Create an account; Cognito emails you a 6-digit code.

To change the monthly budget (default $50): `npx cdk deploy -c alertEmail=you@example.com -c monthlyBudgetUsd=40`.

## Updating

After pulling changes, run `npx cdk deploy` again from `infra`. New SQL migrations apply automatically during the deploy, before the API restarts. If a migration fails, the deploy stops and rolls back, and the error is in the **MigrateFunction** logs in CloudWatch.

## Notes

- **Email.** Cognito's built-in email sends up to 50 messages a day, plenty for testing and a single team. For more, connect Amazon SES in the user pool's messaging settings.
- **Coming from Supabase.** User accounts can't be copied (Cognito can't import Supabase's password hashes), so everyone signs up again. If you want to bring existing weigh-ins and practices over, ask and we'll add an import step that matches old rows to new accounts by email.
- **Tokens.** The app signs in with Cognito's `USER_PASSWORD_AUTH` flow over HTTPS and sends the ID token to the API. A small Lambda adds `role: authenticated` to that token, which is how PostgREST knows which database role to use. Tokens last an hour and refresh automatically; sessions last 30 days.
- **Database access.** The database has no public address. Only the PostgREST task and the migration Lambda can reach it.
- **Deleting everything.** `npx cdk destroy`. The database has deletion protection (turn it off in the RDS console first), a final snapshot is kept, and the Cognito user pool is kept so accounts aren't lost by accident. Delete those by hand if you really mean it.

## Testing without AWS

Everything above can be exercised locally with Docker, which is how the stack is tested:

```bash
cd infra
npm run local                     # Postgres 16 (non-superuser, like RDS) + PostgREST, migrations applied
MATLOG_STATE=.local npm run test:integration   # privacy rules, coach mode, deletion over HTTP
npx tsx test/fake-cognito.ts .local            # a local stand-in for Cognito + API Gateway on :53100
npm test                          # infrastructure assertions (no AWS account needed)
```

Point the app at the stand-in with `EXPO_PUBLIC_API_URL=http://localhost:53100`, `EXPO_PUBLIC_COGNITO_ENDPOINT=http://localhost:53100/`, `EXPO_PUBLIC_COGNITO_REGION=us-east-1`, and `EXPO_PUBLIC_COGNITO_CLIENT_ID=local-test-client`. Confirmation codes are at http://localhost:53100/__codes.

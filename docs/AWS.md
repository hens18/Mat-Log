# Running Mat Log on AWS

Mat Log's backend runs entirely on AWS, defined as code in [`infra/`](../infra) with the AWS CDK. One command creates everything; one command updates it.

```
 App ──HTTPS──▶ API Gateway ──▶ PostgREST in Lambda ──▶ PostgreSQL (RDS or Aurora)
  │                                ▲ checks every request's Cognito token
  └──HTTPS──▶ Amazon Cognito (sign up, sign in, password reset)
```

It's built to cost close to nothing: the API only runs when someone uses the app, and nothing else bills by the hour except the database.

| Piece | AWS service | What it does |
| --- | --- | --- |
| Database | Amazon RDS for PostgreSQL 16 (db.t4g.micro), or Aurora Serverless v2 | All data. Every row-level security policy from `supabase/migrations` runs unchanged. |
| Sign-in | Amazon Cognito | Email and password accounts, email confirmation codes, password reset codes. |
| API | PostgREST in AWS Lambda | Turns the database into the REST API the app already used. Verifies each Cognito token, then lets Postgres's row-level security decide what that user can see. Runs only per request. |
| Front door | Amazon API Gateway (HTTP API) | The public HTTPS URL, rate limited. |
| Migrations | Two AWS Lambdas (run on each deploy) | Apply any new SQL from `supabase/migrations` and `infra/sql`. |
| Secrets | AWS Secrets Manager | Database passwords. Nothing secret is in the code or the app. |
| Budget | AWS Budgets | Emails you at 50%, 80%, and 100% of a monthly budget, and as soon as AWS forecasts the month will go over. |

## What it costs

Two database choices, set when you deploy:

| | `rds` (default) | `aurora` |
| --- | --- | --- |
| Database | db.t4g.micro, always on: **$0 for 12 months on the AWS free tier**, about $13/month after | Aurora Serverless v2 that pauses after 5 idle minutes: storage only, about $0.50 to $2/month for light use |
| First request after a quiet stretch | Instant | About 15 extra seconds while the database wakes |
| API (Lambda + API Gateway) | $0 at a team's traffic (Lambda's free allowance never expires) | same |
| Cognito | $0 up to 10,000 monthly users | same |
| Two Secrets Manager secrets | about $0.80/month | same |
| Logs | pennies | same |

Check whether your account still has the free tier:

```powershell
aws freetier get-free-tier-usage --region us-east-1 --query "freeTierUsages[?service=='Amazon Relational Database Service'].[usageType,limit,actualUsageAmount]" --output table
```

A table with RDS rows means `rds` is free for now. An empty result means use `aurora`.

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

Add `-c database=aurora` if you don't have the RDS free tier. The deploy downloads PostgREST (checked against a pinned checksum) the first time.

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

After pulling changes, run `npx cdk deploy` again from `infra`. New SQL migrations apply automatically during the deploy, before the API restarts. If a migration fails, the deploy stops and rolls back, and the error is in the **MigrateFunction** and **MigrateStartFunction** logs in CloudWatch.

Switching databases (`-c database=aurora` or back to `rds`) creates a new, empty database and removes the old one after taking a final snapshot, so do it before you have data you care about.

## Notes

- **Email.** Cognito's built-in email sends up to 50 messages a day, plenty for testing and a single team. For more, connect Amazon SES in the user pool's messaging settings.
- **Coming from Supabase.** User accounts can't be copied (Cognito can't import Supabase's password hashes), so everyone signs up again. If you want to bring existing weigh-ins and practices over, ask and we'll add an import step that matches old rows to new accounts by email.
- **Tokens.** The app signs in with Cognito's `USER_PASSWORD_AUTH` flow over HTTPS and sends the ID token to the API. A small Lambda adds `role: authenticated` to that token, which is how PostgREST knows which database role to use. Tokens last an hour and refresh automatically; sessions last 30 days.
- **Database access.** The database has no public address and its subnets have no route to the internet. Only the PostgREST Lambda and the migration Lambda can reach it. PostgREST's database password is set on its Lambda at deploy time, because that Lambda deliberately has no route to Secrets Manager; the role it logs in as can only act as a signed-out or verified user under row-level security.
- **Deleting everything.** `npx cdk destroy`. A final database snapshot is kept, and the Cognito user pool is kept so accounts aren't lost by accident. Delete those by hand in the console if you really mean it (snapshots cost a few cents a month).

## Testing without AWS

Everything above can be exercised locally with Docker, which is how the stack is tested:

```bash
cd infra
npm run local                     # Postgres 16 (non-superuser, like RDS) + PostgREST, migrations applied
MATLOG_STATE=.local npm run test:integration   # privacy rules, coach mode, deletion, and the Lambda adapter
npx tsx test/fake-cognito.ts .local            # a local stand-in for Cognito + API Gateway on :53100
npm test                          # infrastructure assertions (no AWS account needed)
```

Point the app at the stand-in with `EXPO_PUBLIC_API_URL=http://localhost:53100`, `EXPO_PUBLIC_COGNITO_ENDPOINT=http://localhost:53100/`, `EXPO_PUBLIC_COGNITO_REGION=us-east-1`, and `EXPO_PUBLIC_COGNITO_CLIENT_ID=local-test-client`. Confirmation codes are at http://localhost:53100/__codes.

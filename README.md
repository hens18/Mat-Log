# Mat Log

A mobile app for wrestlers to track weight and practices. Log weigh-ins throughout the day, see your trend over time, and understand how much weight each practice takes off.

Built with Expo (React Native), TypeScript, Supabase, and react-native-gifted-charts.

## Features

Phase 1 (in progress):

- **Email auth** with Supabase
- **Weigh-ins** tagged by kind: morning, pre-practice, post-practice, or night
- **Trend chart** with a Day / Week / Month toggle (week and month views plot averages)
- **Stats**: change since the last weigh-in, net change for the selected range, and the biggest day-to-day jump and drop with their dates

The database already includes tables for practices (with a generated `weight_lost` column) and practice reflections, which later phases will build on.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Expo SDK 57, React Native, TypeScript (strict) |
| Navigation | Expo Router (file-based routes in `src/app`) |
| Backend | Supabase (Postgres, Auth, row-level security) |
| Charts | react-native-gifted-charts (with react-native-svg and expo-linear-gradient) |
| Tooling | ESLint (eslint-config-expo), Supabase CLI migrations |

## Project structure

```
.
├── src/
│   ├── app/              # Expo Router routes (every file is a screen)
│   ├── components/       # Shared UI components
│   ├── features/         # Feature modules: hooks, components, and queries
│   │   ├── auth/
│   │   ├── weigh-ins/
│   │   └── practices/
│   ├── lib/              # Supabase client and env loading
│   ├── constants/        # Theme tokens (colors, spacing, radius)
│   ├── types/            # Database types and model aliases
│   └── utils/            # Pure helpers (date math, stats)
├── supabase/
│   ├── config.toml       # Supabase CLI config for local development
│   └── migrations/       # SQL migrations, applied in filename order
├── assets/               # App icons and splash images
├── app.json              # Expo config
└── .env.example          # Template for required environment variables
```

## Database

| Table | Purpose |
| --- | --- |
| `profiles` | One row per user, created automatically on sign-up. Stores display name, weight unit (`lb` or `kg`), weight class, and goal weight. |
| `weigh_ins` | A single scale reading: `weight`, `kind` (`morning`, `pre_practice`, `post_practice`, `night`), `recorded_at`, optional note. |
| `practices` | A practice session with `pre_weight` and `post_weight`. `weight_lost` is a stored generated column (`pre_weight - post_weight`) computed by Postgres. |
| `practice_reflections` | One journal entry per practice: what went well, what to improve, focus for next time, and energy (1 to 5). |

### Security

Row-level security is enabled on every table. Users can only read and write their own rows, enforced in Postgres rather than in app code:

- Every policy checks `auth.uid() = user_id` (or `= id` for profiles) and applies only to the `authenticated` role.
- Inserts and updates use `WITH CHECK`, so a user cannot create a row for someone else or reassign a row to another user.
- A reflection can only be attached to a practice owned by the same user.
- The `anon` role has no access to these tables.

See [`supabase/migrations`](supabase/migrations) for the full SQL.

## Getting started

### Prerequisites

- Node.js 20.19.4 or newer (22 LTS recommended)
- A [Supabase](https://supabase.com) account (free tier is fine), or Docker if you want to run Supabase locally
- The [Expo Go](https://expo.dev/go) app on your phone, or an iOS simulator / Android emulator

### 1. Clone and install

```bash
git clone https://github.com/Hens18/mat-log.git
cd mat-log
npm install
```

### 2. Set up Supabase

Pick one of the options below.

**Option A: hosted Supabase project (recommended)**

1. Create a new project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Link this repo to it and push the migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   Alternatively, paste each file in `supabase/migrations` into the dashboard's SQL Editor and run them in filename order.

3. Under **Authentication > Sign In / Providers**, make sure **Email** is enabled. For quicker local testing you can turn off **Confirm email**; otherwise new users must click the link in their inbox before signing in.

**Option B: local Supabase with Docker**

```bash
npx supabase start   # starts Postgres, Auth, and Studio, and applies the migrations
npx supabase status  # prints the local API URL and anon key
```

Local email confirmation is off by default (see `supabase/config.toml`). Use `npx supabase db reset` to rebuild the local database from the migrations.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your project's values from **Project Settings > API** (or from `npx supabase status` for local):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`.env` is gitignored. Only the anon/publishable key belongs here, since `EXPO_PUBLIC_` values are bundled into the app. Never use the service role key in the client. Row-level security is what keeps each user's data private.

When testing on a physical phone against local Supabase, replace `127.0.0.1` in the URL with your computer's LAN IP address.

### 4. Run the app

```bash
npm start
```

Then scan the QR code with Expo Go, or press `i` (iOS simulator), `a` (Android emulator), or `w` (web).

Restart Expo after editing `.env` so the new values are picked up.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `npm run android` / `npm run web` | Start and open on a specific platform |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run db:types` | Regenerate `src/types/database.ts` from the local Supabase database |

## Roadmap

- [x] Project setup, schema, and row-level security
- [ ] Email sign-up, sign-in, and sign-out
- [ ] Log, edit, and delete weigh-ins
- [ ] Trend chart with Day / Week / Month views
- [ ] Weight stats
- [ ] Practice logging with pre/post weights
- [ ] Practice reflections

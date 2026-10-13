# Mat Log

A mobile app for wrestlers to track weight and practices. Log weigh-ins throughout the day, see your trend over time, and understand how much weight each practice takes off.

Built with Expo (React Native), TypeScript, Supabase, and react-native-gifted-charts.

## Features

**Weight**

- **Weigh-ins** tagged by kind (morning, pre-practice, post-practice, or night) with an optional note. The form starts from your last weight with -1 / -0.1 / +0.1 / +1 steppers. Log now or for an earlier date and time, and tap any weigh-in to edit or delete it.
- **Trend chart** with a Day / Week / Month toggle, a tap-to-inspect tooltip, and a dashed goal line
  - Day: every weigh-in from the last 7 days
  - Week: weekly averages (Monday to Sunday) for the last 12 weeks
  - Month: monthly averages for the last 12 months
- **Stats**
  - Change since the last weigh-in, and distance from your goal weight
  - Net change for the selected range (first chart point to last)
  - Biggest day-to-day jump and drop with their dates. Each day is reduced to its average first, so a post-practice weigh-in doesn't count as a huge drop from that morning.

**Practices**

- Log a practice with date, duration, intensity (1 to 5), pre and post weights, and notes. Pre and post weights prefill from that day's pre-practice and post-practice weigh-ins.
- Weight lost is a generated column in Postgres (`pre_weight - post_weight`), so it can never drift out of sync.
- Summary of practices and minutes this week, average weight lost over the last 10 practices, and the biggest single-practice loss.
- **Reflections**: one per practice, with an energy rating, what went well, what to improve, and a focus for next practice.

**Fuel (calorie tracking)**

- Search hundreds of thousands of foods from [USDA FoodData Central](https://fdc.nal.usda.gov/) (generic foods listed first, plus branded products), pick a serving size and number of servings, and watch calories and macros update before adding it.
- Scan a barcode on your phone to look up packaged foods in [Open Food Facts](https://world.openfoodfacts.org/).
- Quick add for anything else: type in a name, calories, and optional protein, carbs, and fat.
- A calorie ring against your daily goal, calories remaining, and macro totals with their share of calories.
- **Micronutrients** for every searched or scanned food: sodium, sugar, saturated fat, cholesterol, fiber, potassium, calcium, iron, magnesium, zinc, and vitamins A, C, D, and B12, each with its % Daily Value. Amounts scale with the serving you pick, and the Fuel tab totals them for the day, noting how many foods the totals cover. Bars for nutrients to limit (sodium, saturated fat, cholesterol) turn amber at 75% and red at 100%.
- **Personal targets.** Add your sex and birth year in Profile and every percentage uses the Dietary Reference Intakes for your age group (for example, a 16-year-old needs 1,300 mg of calcium, an adult 1,000 mg). Fiber and saturated fat follow your calorie goal. Without a profile, the general FDA Daily Values are used.
- **Weekly nutrient report.** Daily averages for the last 7 days (or any earlier week) against your targets: what's running low, what's over the limit, and what's on track. Each shortfall explains why it matters, names the foods you logged that supplied the most, lists good sources to add, and gives a practical tip. Protein is compared with a target based on your latest weight (1.4 to 2.0 g per kg). Nutrients that too few of your foods reported are listed separately instead of being called low.
- A two-week day picker, and recently logged foods that re-add in one tap, servings included.

**Today**

- A glowing progress ring toward your goal weight with a "to goal" pill, quick actions for weigh-ins, practices, and food, and a summary of your weigh-in streak, calories today, and practices this week.

**Account**

- Email sign-up and sign-in with Supabase Auth; the session survives app restarts.
- Profile with name, weight class, goal weight, daily calorie goal, and lb/kg units.
- In-app account deletion that removes every row the user owns (required by the App Store).

**Feel**

- Inter for text and Barlow Condensed for scoreboard-style numbers
- A floating pill tab bar, large-title headers, and color-coded badges
- Haptic feedback, toast confirmations, springy buttons, and staggered entrance animations

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Expo SDK 57, React Native, TypeScript (strict) |
| Navigation | Expo Router (file-based routes in `src/app`) |
| Backend | Supabase (Postgres, Auth, row-level security) |
| Charts | react-native-gifted-charts (with react-native-svg and expo-linear-gradient) |
| Data fetching | TanStack Query |
| UI and motion | Reanimated, Gesture Handler, expo-haptics, sonner-native, Expo Google Fonts |
| Testing | Jest (jest-expo) |
| Tooling | ESLint (eslint-config-expo), Prettier, Supabase CLI migrations, EAS Build |

## Project structure

```
.
├── src/
│   ├── app/              # Expo Router routes (every file is a screen)
│   ├── components/       # Shared UI components
│   ├── features/         # Feature modules: queries, hooks, components, pure logic
│   │   ├── auth/
│   │   ├── weigh-ins/
│   │   ├── practices/
│   │   └── profile/
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
| `profiles` | One row per user, created automatically on sign-up. Stores display name, weight unit (`lb` or `kg`), weight class, goal weight, calorie goal, and optional sex and birth year for nutrient targets. |
| `weigh_ins` | A single scale reading: `weight`, `kind` (`morning`, `pre_practice`, `post_practice`, `night`), `recorded_at`, optional note. |
| `practices` | A practice session with `pre_weight` and `post_weight`. `weight_lost` is a stored generated column (`pre_weight - post_weight`) computed by Postgres. |
| `practice_reflections` | One journal entry per practice: what went well, what to improve, focus for next time, and energy (1 to 5). |
| `food_logs` | One logged food: day, meal, name, calories, optional protein, carbs, and fat in grams, the serving and source it came from, and a `micros` jsonb object with micronutrient totals for the entry. `profiles.calorie_goal` holds the daily target. |

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
EXPO_PUBLIC_USDA_API_KEY=your-usda-key
```

The USDA key powers food search. Get one free in about a minute at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup) (1,000 searches per hour). Without it the app falls back to USDA's shared `DEMO_KEY`, which runs out after a handful of searches. Barcode scanning (Open Food Facts) needs no key.

`.env` is gitignored. Only the anon/publishable key belongs here, since `EXPO_PUBLIC_` values are bundled into the app. Never use the service role key in the client. Row-level security is what keeps each user's data private.

When testing on a physical phone against local Supabase, replace `127.0.0.1` in the URL with your computer's LAN IP address.

### 4. Run the app

```bash
npm start
```

Then scan the QR code with Expo Go, or press `i` (iOS simulator), `a` (Android emulator), or `w` (web).

If your phone can't connect (common on school or public Wi-Fi), run `npm run start:tunnel` instead. It routes through the internet, so the phone and computer don't need to share a network.

Restart Expo after editing `.env` so the new values are picked up.

## Testing

The chart, stats, and form-parsing logic lives in pure functions (for example `src/features/weigh-ins/trend.ts` and `src/features/practices/stats.ts`) with unit tests in the neighboring `__tests__/` folders. Run them with:

```bash
npm test
```

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `npm run android` / `npm run web` | Start and open on a specific platform |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm test` | Run the Jest unit tests |
| `npm run format` | Format the code with Prettier |
| `npm run db:types` | Regenerate `src/types/database.ts` from the local Supabase database |

## Releasing to the App Store

The app is set up for EAS Build: icon, splash screen, bundle ID, `eas.json`, and in-app account deletion are in place. [docs/ROADMAP.md](docs/ROADMAP.md) walks through the rest step by step (Apple Developer account, EAS environment variables, building, TestFlight, the App Store listing, and common rejection risks).

## Roadmap

Done: project setup, schema and RLS, auth, weigh-ins, the trend chart and stats, practices, reflections, profile, account deletion, calorie tracking with food search, barcode scanning, micronutrients with personal targets, and a weekly nutrient report, and a redesign based on reference designs.

Next up, from the full list in [docs/ROADMAP.md](docs/ROADMAP.md):

- [ ] Weigh-in reminders
- [ ] Make-weight plan with a target line toward a weight class and meet date
- [ ] Meet calendar
- [ ] Practice weight-loss chart
- [ ] Apple Health sync
- [ ] Saved meals (log a usual breakfast as one item) and favorite foods
- [ ] Proxy food search through a Supabase Edge Function so the USDA key stays server-side
- [ ] Password reset

# Mat Log roadmap

Three parts: the open-source libraries worth building on, feature ideas ranked by impact, and the full path from this repo to the App Store.

## 1. Libraries

GitHub has no 4.5-star rating; repos only collect stars. The bar used here: a widely used library, still maintained, compatible with Expo SDK 57, and ideally included in Expo Go so it works without a custom build. Star counts are approximate and come from third-party trackers (dates noted where the source gave one), so check the repo for a live number.

### Already in the app

| Library | What it does in Mat Log | Stars | Expo Go |
| --- | --- | --- | --- |
| [react-native-reanimated](https://github.com/software-mansion/react-native-reanimated) | Entrance animations, springy button presses | ~10.9k (Star History, June 2026) | Yes |
| [react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler) | Gesture system that toasts and sheets build on | Not checked; Software Mansion, core RN library | Yes |
| [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) | Tactile feedback on saves, deletes, tab and segment changes | Part of the Expo SDK | Yes |
| [sonner-native](https://github.com/gunnartorfis/sonner-native-toasts) | "Weigh-in saved" style toasts | ~1.3k (GitTrend, 2026) | Yes |
| [react-native-gifted-charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) | Trend chart, tooltip, goal line | Not checked | Yes |
| [@expo-google-fonts](https://github.com/expo/google-fonts) | Inter and Barlow Condensed | Part of the Expo org | Yes |
| [TanStack Query](https://github.com/TanStack/query) | Server state, caching, refetching | Not checked; one of the most used React data libraries | Yes |

sonner-native has fewer stars than the rest. It made the cut because it's small, actively maintained, and has the cleanest toast API in React Native. It's easy to swap if it ever goes stale.

### Worth adding next

| Library | Why | Stars | Expo Go |
| --- | --- | --- | --- |
| [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) | Quick-log weigh-in sheet that slides up instead of a full modal | ~8.8k (Star History, March 2026) | Yes |
| [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) | Daily weigh-in reminders | Part of the Expo SDK | Local notifications yes |
| [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) + TanStack Query persister | Offline cache so the app opens instantly with no signal (gyms!) | Not checked | No, needs a dev build |
| [@kingstinct/react-native-healthkit](https://github.com/kingstinct/react-native-healthkit) | Read and write body weight in Apple Health | Not checked | No, needs a dev build |

### Considered but not now

| Library | Notes |
| --- | --- |
| [NativeWind](https://github.com/nativewind/nativewind) (~6.1k, ecosyste.ms) and [react-native-reusables](https://github.com/founded-labs/react-native-reusables) (~8.4k, per a vendor blog) | Tailwind styling and shadcn-style components. Great for a new project, but switching would mean restyling every screen for little user-visible gain. |
| [Tamagui](https://github.com/tamagui/tamagui), [gluestack-ui](https://github.com/gluestack/gluestack-ui) | Full design systems. Same tradeoff as NativeWind. |
| [Victory Native](https://github.com/FormidableLabs/victory-native-xl) | Skia-based charts with smoother gestures. Worth it if charts get more complex (for example, overlaying practices on the weight trend). |
| [Lucide](https://github.com/lucide-icons/lucide) (~24.7k) | A cleaner icon set than Ionicons. Cosmetic; only worth it alongside a broader design refresh. |
| [Moti](https://github.com/nandorojo/moti) (~3.8k as of 2024) | Declarative animations on top of Reanimated. Reanimated's built-in entering animations already cover what the app needs. |

Sources for star counts: [Star History: Reanimated](https://www.star-history.com/software-mansion/react-native-reanimated), [Star History: bottom-sheet](https://www.star-history.com/gorhom/react-native-bottom-sheet), [GitTrend: sonner-native](https://gittrend.io/repo/gunnartorfis/sonner-native-toasts), [ecosyste.ms: NativeWind](https://repos.ecosyste.ms/topics/nativewind), [VP0: RN UI libraries 2026](https://vp0.com/blogs/react-native-ui-component-libraries-github-2026), [AlternativeTo: Lucide](https://alternativeto.net/software/lucide/about), [ecosyste.ms: Moti](https://awesome.ecosyste.ms/projects/78258).

## 2. Feature ideas

Ranked by how much they help a wrestler during a season. "Dev build" means the feature needs native code that Expo Go doesn't include, so testing it requires an EAS development build.

Calorie tracking has shipped: USDA FoodData Central search with serving sizes, Open Food Facts barcode scanning, quick add, and a micronutrient breakdown with % Daily Value per food and per day. Next steps there are saved meals, favorite foods, and moving food search behind a Supabase Edge Function so the USDA key isn't bundled into the app and results can be cached server-side.

### High impact

1. **Weigh-in reminders.** A morning notification ("Step on the scale before you eat") is the single biggest driver of consistent data. Local notifications only, no server. `expo-notifications`.
2. **Make-weight plan.** Pick a weight class and a meet date, and Mat Log draws a target line on the chart and shows "1.8 lb to go, 12 days left, 0.15 lb/day." It should flag a pace faster than the high school weight-loss limit (1.5% of body weight per week under NFHS rules), which also keeps the app on the right side of App Review guideline 1.4.1 on physical harm.
3. **Meet calendar.** Upcoming duals and tournaments with weigh-in times, feeding the make-weight plan and reminders.
4. **Practice weight-loss chart.** Plot weight lost per practice over the season, and correlate it with intensity and duration.
5. **Apple Health sync.** Smart scales already write to Health, so importing weights removes manual entry. Dev build.

### Medium impact

6. **Offline mode.** Cache data locally and queue writes so logging works in a gym with no signal. Dev build (MMKV).
7. **Streaks and consistency.** "Weighed in 14 days straight" on the dashboard. Pure UI over existing data.
8. **lb/kg conversion.** Convert stored weights when switching units instead of only relabeling.
9. **Season summary.** Total practices, mat hours, average cut, and best week, as a shareable card.
10. **Export.** CSV or PDF of weigh-ins for coaches and athletic trainers.
11. **Password reset and Sign in with Apple.** Expected by users; Apple requires Sign in with Apple if you ever add Google or other social logins.

### Bigger bets

12. **Coach mode.** Coaches create a team code, athletes join, and the coach sees a roster of weights. Needs new tables and RLS policies that share rows with a coach, plus clear consent.
13. **Home screen widget.** Current weight and distance to goal at a glance. Needs native widget code.
14. **Hydration tracking.** Log fluids alongside weigh-ins, since most day-to-day swings are water.

## 3. Shipping to the App Store

### What it costs

- **Apple Developer Program:** $99/year, required for TestFlight and the App Store. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/). You must be 18 or older to enroll; otherwise a parent or guardian enrolls and adds you.
- **Expo account and EAS:** free tier includes a limited number of cloud builds per month, which is plenty for one app. No Mac or Xcode needed.
- **Supabase:** free tier is fine to launch on. Free projects pause after a week of inactivity, so upgrade before real users depend on it.

### What's already done in this repo

- App icon and splash screen (`assets/`), with the iOS icon saved without an alpha channel
- Bundle identifier `com.hens18.matlog` in `app.json`. Change it now if you want something else; it can't be changed after the first App Store upload.
- `ITSAppUsesNonExemptEncryption: false`, which skips the export compliance question on every upload
- `eas.json` with `preview` and `production` build profiles
- In-app account deletion, which Apple requires for any app with sign-up

### Step by step

**1. Connect the project to EAS** (once)

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

`init` adds an EAS project ID to `app.json`. Commit that change.

**2. Give EAS your Supabase keys**

`.env` is gitignored, so cloud builds can't see it. Store the same values as EAS environment variables:

```bash
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR-REF.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR-ANON-KEY --visibility sensitive
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_USDA_API_KEY --value YOUR-USDA-KEY --visibility sensitive
```

Repeat with `--environment preview` for preview builds.

**3. Make Supabase production-ready**

- Run `npx supabase db push` so the hosted database has every migration, including account deletion.
- Under **Authentication > Emails**, set up custom SMTP (for example [Resend](https://resend.com)). Supabase's built-in email is rate-limited to a handful of messages per hour and is meant for testing.
- Under **Authentication > URL Configuration**, set the Site URL to your website or support page so confirmation emails link somewhere sensible.

**4. Build for iOS**

```bash
npx eas-cli@latest build --platform ios --profile production
```

EAS asks you to sign in with your Apple ID, then creates and stores the signing certificate and provisioning profile for you. The build runs in the cloud and takes about 15 to 30 minutes.

**5. Upload to App Store Connect and TestFlight**

```bash
npx eas-cli@latest submit --platform ios --latest
```

This creates the app record in App Store Connect if needed and uploads the build. After Apple finishes processing (usually under an hour), add yourself and teammates as internal testers in TestFlight and install the app from the TestFlight app on your iPhone. Test everything here before submitting for review.

**6. Fill in the App Store listing** at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

- **Name, subtitle, description, keywords.** For example "Mat Log" with the subtitle "Wrestling weight tracker".
- **Category:** Health & Fitness.
- **Screenshots:** at least one set for the 6.9-inch iPhone size. Take them in the iOS Simulator or from TestFlight on a large iPhone.
- **Privacy policy URL:** required. A simple page explaining that you store email, weights, and practice notes in Supabase, never sell them, and that users can delete their account in the app.
- **App Privacy questionnaire:** declare Contact Info (email) and Health & Fitness (weight, practices, and food logs), all linked to the user and used for app functionality, with no tracking. The camera is used only to read barcodes on the device and nothing from it is collected, so it isn't declared as collected data.
- **Age rating questionnaire.**
- **App Review notes:** include a demo account email and password with some sample data, so the reviewer can sign in. Explain briefly that the app logs weigh-ins and practices for wrestlers.

**7. Submit for review**

Pick the build, click **Add for Review**, then **Submit**. Reviews usually take a day or two. If Apple rejects it, the message cites a guideline number. Fix it, rebuild, and resubmit.

### Common rejection risks for this app

- **No demo account** in the review notes (guideline 2.1). Reviewers can't test behind a login without one.
- **Placeholder or broken content.** Make sure the demo account has real-looking data.
- **Physical harm (1.4.1).** Keep the copy about tracking and safe weight management, never about rapid cutting. A short disclaimer in the app or listing that it isn't medical advice helps.
- **Missing account deletion (5.1.1(v)).** Already handled.

### After launch

- **JavaScript-only changes** (most UI and logic) can ship instantly as over-the-air updates with [EAS Update](https://docs.expo.dev/eas-update/introduction/) once `expo-updates` is added.
- **Native changes** (new native libraries, app.json plugins, icon changes) need a new build, `eas submit`, and another review. `autoIncrement` in `eas.json` bumps the build number each time; bump `version` in `app.json` for user-visible releases.

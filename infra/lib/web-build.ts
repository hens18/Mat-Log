// Builds the web version of the app (the repo root's `expo export`) so the
// stack can upload it. The build bakes in the EXPO_PUBLIC_* values from the
// root .env, so the site talks to this stack's API and Cognito.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_COGNITO_REGION', 'EXPO_PUBLIC_COGNITO_CLIENT_ID'];

/** Runs the web export and returns the folder it wrote. */
export function buildWeb(repoRoot: string): string {
  const envFile = join(repoRoot, '.env');
  const env = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
  const missing = REQUIRED.filter(
    (name) => !process.env[name] && !new RegExp(`^${name}=\\S+`, 'm').test(env),
  );
  if (missing.length > 0) {
    throw new Error(
      `The web build needs ${missing.join(', ')} in ${envFile}. Copy them from this stack's ` +
        'outputs (ApiUrl, Region, UserPoolClientId), or deploy with -c web=false to skip the site.',
    );
  }
  if (!existsSync(join(repoRoot, 'node_modules', 'expo'))) {
    throw new Error(`Run "npm install" in ${repoRoot} first, so the web app can be built.`);
  }

  const outDir = join(repoRoot, 'dist');
  console.error('Building the web app (expo export)...');
  // Progress goes to stderr: the CDK CLI reads the app's stdout.
  execSync('npx expo export --platform web --output-dir dist', {
    cwd: repoRoot,
    stdio: ['ignore', 2, 2],
  });
  if (!existsSync(join(outDir, 'index.html'))) {
    throw new Error(`The web build finished but ${join(outDir, 'index.html')} is missing.`);
  }
  return outDir;
}

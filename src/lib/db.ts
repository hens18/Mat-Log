// The data client. PostgREST on AWS speaks the same API as Supabase's data
// API, so supabase-js does the querying; Cognito handles sign-in instead of
// Supabase Auth, and each request carries the Cognito ID token, which
// PostgREST verifies before row-level security runs.

import { createClient } from '@supabase/supabase-js';

import { env, isBackendConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

import { getIdToken } from './session';

// When .env is missing the root layout shows a setup screen and never calls
// the client, but createClient still needs a syntactically valid URL.
const url = isBackendConfigured ? env.apiUrl : 'http://localhost:3000';

export const db = createClient<Database>(url, 'not-used-with-cognito', {
  accessToken: getIdToken,
});

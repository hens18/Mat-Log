import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

// When .env is missing the root layout shows a setup screen and never calls
// the client, but createClient still needs a syntactically valid URL.
const url = isSupabaseConfigured ? env.supabaseUrl : 'http://localhost:54321';
const key = isSupabaseConfigured ? env.supabaseAnonKey : 'not-configured';

export const supabase = createClient<Database>(url, key, {
  auth: {
    // On web, supabase-js falls back to localStorage.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh the session while the app is in the foreground.
// https://supabase.com/docs/reference/javascript/auth-startautorefresh
if (Platform.OS !== 'web' && isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

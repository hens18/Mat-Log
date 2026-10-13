// Expo only inlines EXPO_PUBLIC_ variables when they are accessed with dot
// notation on process.env, so each one has to be referenced explicitly.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const missingEnvVars = [
  !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
  !supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
].filter((name): name is string => Boolean(name));

export const isSupabaseConfigured = missingEnvVars.length === 0;

export const env = {
  supabaseUrl: supabaseUrl ?? '',
  supabaseAnonKey: supabaseAnonKey ?? '',
};

import { createClient } from '@supabase/supabase-js';

// We use placeholders if keys are missing to allow the app to boot.
// The app will still show errors when trying to connect, but won't crash on load.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'SASORI_WARNING: Supabase credentials are not configured. UI features requiring Auth or Database will not function correctly. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

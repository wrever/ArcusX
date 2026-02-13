import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Si faltan las variables, se usa un client "dummy" para que la app no rompa al cargar.
// Auth/Supabase no funcionarán hasta que definas VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env
const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project'));

export const supabase: SupabaseClient = createClient(
  hasSupabase ? supabaseUrl : 'https://placeholder.supabase.co',
  hasSupabase ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'supabase.auth.token'
    }
  }
);


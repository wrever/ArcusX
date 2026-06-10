import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Leer de .env (desarrollo) o de lo embebido en el build (producción: npm run build debe ejecutarse CON .env o .env.production)
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const hasValidUrl = Boolean(supabaseUrl && !supabaseUrl.includes('your-project'));
const hasValidKey = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20);
export const hasSupabase = hasValidUrl && hasValidKey;

if (import.meta.env.DEV && !hasSupabase && (supabaseUrl || supabaseAnonKey)) {
  console.warn(
    'ArcusX Supabase: URL o anon key inválidos o incompletos. Login con Google/GitHub no funcionará. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en arcusx/.env'
  );
}

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


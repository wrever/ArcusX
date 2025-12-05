import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atgsesbstjleabesclzs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z3Nlc2JzdGpsZWFiZXNjbHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTY3NzgsImV4cCI6MjA3ODAzMjc3OH0.RjwwgXaHHQ-Pz69qeZfXKRc0AuuNdAm3wjecY0xB-YY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  }
});


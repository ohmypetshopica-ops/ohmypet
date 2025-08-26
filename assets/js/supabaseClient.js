// assets/js/supabaseClient.js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

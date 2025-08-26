// assets/js/guard.js
import { supabase } from './supabaseClient.js';
import { injectUI } from './ui.js';

async function enforce() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.replace('login.html');
    return;
  }
  await injectUI();
}
enforce();

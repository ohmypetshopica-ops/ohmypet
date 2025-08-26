// assets/js/modules/auth.js
import { supabase } from '../supabaseClient.js';
import { SITE_URL } from '../env.js';

export async function loginWithPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  location.href = 'dashboard.html';
}

export async function loginWithGoogle() {
  const redirectTo = SITE_URL + '/public/auth-callback.html';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
  if (error) throw error;
}

export async function sendMagicLink(email) {
  const redirectTo = SITE_URL + '/public/auth-callback.html';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });
  if (error) throw error;
}

export async function registerEmailPassword({ email, password, full_name }) {
  const redirectTo = SITE_URL + '/public/auth-callback.html';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: { full_name }
    }
  });
  if (error) throw error;

  // Si tu proyecto NO requiere confirmación por email, data.session vendrá con sesión creada:
  if (data?.session) {
    location.href = 'dashboard.html';
  } else {
    alert('Registro creado. Revisa tu correo para confirmar la cuenta.');
    location.href = 'login.html';
  }
}

// --- CALLBACK (no cambia) ---
function parseHashTokens() {
  const hash = location.hash.slice(1);
  const p = new URLSearchParams(hash);
  return { access_token: p.get('access_token'), refresh_token: p.get('refresh_token') };
}

export async function handleAuthCallback() {
  const url = new URL(location.href);
  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(location.href);
    if (error) throw error;
    location.replace('dashboard.html');
    return;
  }
  const { access_token, refresh_token } = parseHashTokens();
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    location.replace('dashboard.html');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session) location.replace('dashboard.html');
}

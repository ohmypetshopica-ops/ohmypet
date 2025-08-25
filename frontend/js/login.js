// login.js
import { supabase } from '../supabase-client.js';

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Error al iniciar sesión: ' + error.message);
    return;
  }

  // ✅ Redirige siempre a index.html dentro de /ohmypet/frontend/
  window.location.href = 'https://codearlo.com/ohmypet/frontend/index.html';
});

// ✅ Botón de login con Google
document.getElementById('google-login')?.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://codearlo.com/ohmypet/frontend/index.html', // callback fija
    },
  });
  if (error) alert('Error: ' + error.message);
});

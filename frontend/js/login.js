// frontend/js/login.js
import { supabase } from '../supabase-client.js';

const loginForm = document.querySelector('#login-form');
const googleLoginButton = document.querySelector('#google-login-btn');

// --- Manejo del formulario de login tradicional ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert(`Error al iniciar sesión: ${error.message}`);
  } else {
    // Redirigir SIEMPRE a index.html
    window.location.href = 'index.html';
  }
});

// --- Manejo del botón de inicio de sesión con Google ---
googleLoginButton.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: new URL('index.html', window.location.href).href,
    }
  });

  if (error) {
    alert(`Error al iniciar sesión con Google: ${error.message}`);
  }
});
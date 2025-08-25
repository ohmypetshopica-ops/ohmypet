// frontend/js/login.js
import { supabase } from '../supabase-client.js';
import { getUserRole } from './models/userRoles.model.js';

const loginForm = document.querySelector('#login-form');
const googleLoginButton = document.querySelector('#google-login-btn');

// --- Manejo del formulario de login tradicional ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(`Error al iniciar sesión: ${error.message}`);
  } else if (data.user) {
    // ¡Éxito! Ahora verificamos el rol del usuario
    const role = await getUserRole(data.user.id);
    
    if (role === 'dueno' || role === 'empleado') {
      // Si es dueño o empleado, va al dashboard
      window.location.href = './pages/dashboard.html';
    } else {
      // Si es cliente o no tiene rol, va al index
      window.location.href = 'index.html';
    }
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
// frontend/js/login.js
import { supabase } from '../supabase-client.js';

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
    console.error(error);
  } else {
    // También cambiamos esta redirección para consistencia
    alert('¡Inicio de sesión exitoso!');
    window.location.href = 'index.html'; 
  }
});

// --- Manejo del botón de inicio de sesión con Google ---
googleLoginButton.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // AQUÍ ESTÁ EL CAMBIO
      redirectTo: window.location.origin + '/frontend/index.html',
    }
  });

  if (error) {
    alert(`Error al iniciar sesión con Google: ${error.message}`);
    console.error('Error detallado:', error);
  }
});
// frontend/js/login.js
import { supabase } from '../supabase-client.js';

const loginForm = document.querySelector('#login-form');

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
    alert('¡Inicio de sesión exitoso!');
    window.location.href = 'tienda.html';
  }
});

// register.js
import { supabase } from '../supabase-client.js';

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const nombre = document.getElementById('nombre').value.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre }
    }
  });

  if (error) {
    alert('Error al registrarse: ' + error.message);
    return;
  }

  alert('Registro exitoso. Revisa tu correo para confirmar.');
  // ✅ Redirige siempre al login dentro de /ohmypet/frontend/
  window.location.href = 'https://codearlo.com/ohmypet/frontend/login.html';
});

// ✅ Botón de registro con Google
document.getElementById('google-register')?.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://codearlo.com/ohmypet/frontend/index.html', // callback fija
    },
  });
  if (error) alert('Error: ' + error.message);
});

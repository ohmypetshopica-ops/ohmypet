// js/register.js
import { supabase } from '../supabase-client.js';

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const nombre = document.getElementById('name').value.trim(); // Corregido para tomar el id 'name' del HTML

  // Ahora solo necesitamos registrar al usuario.
  // La base de datos se encargará de asignarle el rol de "cliente" automáticamente.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // Guardamos el nombre en los metadatos del usuario por si lo necesitamos después
        full_name: nombre 
      }
    }
  });

  if (error) {
    alert('Error al registrarse: ' + error.message);
    return;
  }

  alert('¡Registro exitoso! Revisa tu correo electrónico para confirmar tu cuenta.');
  
  // Redirigimos al usuario a la página de login para que pueda iniciar sesión.
  window.location.href = 'login.html';
});
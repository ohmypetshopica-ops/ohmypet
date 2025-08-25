// frontend/js/logout.js
import { supabase } from '../supabase-client.js';
const btn = document.querySelector('#logout-button');

btn?.addEventListener('click', async (e) => {
  e.preventDefault();
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert(`Error al cerrar sesión: ${error.message}`);
    console.error(error);
  } else {
    window.location.href = 'login.html';
  }
});

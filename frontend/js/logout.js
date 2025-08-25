// frontend/js/logout.js
import { supabase } from '../supabase-client.js';

const logoutBtn = document.querySelector('#logout-button');

if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(`Error al cerrar sesión: ${error.message}`);
      console.error(error);
    } else {
      alert('Sesión cerrada correctamente.');
      window.location.href = 'login.html';
    }
  });
}

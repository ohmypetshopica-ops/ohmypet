// js/logout.js
import { supabase } from '../supabase-client.js';

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#logout-button');
  if (!btn) return;
  e.preventDefault();

  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(`Error al cerrar sesión: ${error.message}`);
  } else {
    // --- RUTA CORREGIDA ---
    // Desde una página como dashboard.html (en /pages),
    // necesitamos subir un nivel para llegar a login.html.
    window.location.href = '../login.html';
  }
});
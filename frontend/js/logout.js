// js/logout.js
import { supabase } from '../supabase-client.js';
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#logout-button');
  if (!btn) return;
  e.preventDefault();
  const { error } = await supabase.auth.signOut();
  if (error) alert(`Error al cerrar sesión: ${error.message}`);
  else window.location.href = '/frontend/login.html';
});

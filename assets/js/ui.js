// assets/js/ui.js
import { supabase } from './supabaseClient.js';

/** Limpia tokens locales de Supabase (prefijo sb-) y redirige a login */
async function secureSignOut() {
  try {
    // Revoca el refresh token en el servidor y borra sesión local
    await supabase.auth.signOut({ scope: 'global' });
  } catch (e) {
    console.warn('signOut error:', e?.message);
  }
  try {
    // Extra: borra claves locales de supabase (defensa en profundidad)
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-')) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('localStorage cleanup error:', e?.message);
  }
  location.href = '/public/login.html';
}

/** Sidebar + listeners */
(async function renderSidebar() {
  const root = document.getElementById('sidebar-root');
  if (!root) return;
  const res = await fetch('/public/shared/sidebar.html');
  root.innerHTML = await res.text();

  // Pinta email en el panel del sidebar
  const { data: { session } } = await supabase.auth.getSession();
  const emailEl = document.getElementById('ohmy-user-email-side');
  if (session?.user?.email && emailEl) emailEl.textContent = session.user.email;

  // Botón salir en sidebar
  const btnOutSide = document.getElementById('ohmy-logout-side');
  if (btnOutSide) btnOutSide.addEventListener('click', secureSignOut);
})();

/** Topbar */
(async function renderTopbar() {
  const top = document.getElementById('topbar-root');
  if (!top) return;
  const res = await fetch('/public/shared/topbar.html');
  top.innerHTML = await res.text();
})();

/** Toggle del sidebar (disponible globalmente) */
export function toggleSidebar(show) {
  const s = document.getElementById('sidebar-root');
  const o = document.getElementById('sidebar-overlay');
  if (!s || !o) return;
  if (show) {
    s.classList.remove('-translate-x-full');
    o.classList.remove('hidden');
  } else {
    s.classList.add('-translate-x-full');
    o.classList.add('hidden');
  }
}
window.toggleSidebar = toggleSidebar;

// assets/js/ui.js
import { supabase } from './supabaseClient.js';

/** Limpia tokens locales de Supabase (prefijo sb-) y redirige a login */
async function secureSignOut() {
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch (e) {
    console.warn('signOut error:', e?.message);
  }
  try {
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-')) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  } catch {}
  // redirige a login relativo (funciona en subcarpetas del dominio)
  const next = encodeURIComponent(location.pathname + location.search + location.hash);
  location.href = `login.html?next=${next}`;
}

/** Inyecta fragmentos HTML en placeholders */
async function includeInto(el, url) {
  try {
    // fetch relativo al DOCUMENTO (no al archivo js)
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    el.innerHTML = await res.text();
  } catch (err) {
    console.error('Include failed:', err);
  }
}

/** Marca link activo en el sidebar */
function highlightActiveLink() {
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('#ohmy-nav a[href]').forEach(a => {
    const leaf = a.getAttribute('href').split('/').pop().toLowerCase();
    if (leaf === current) a.classList.add('text-emerald-700', 'font-semibold');
  });
}

/** Listeners de UI que dependen del DOM inyectado */
function wireUI() {
  const logout = document.getElementById('ohmy-logout');
  if (logout) logout.addEventListener('click', (e) => { e.preventDefault(); secureSignOut(); });
  highlightActiveLink();
}

/** Render sidebar */
(async function renderSidebar() {
  const root = document.getElementById('sidebar-root');
  if (!root) return;
  await includeInto(root, 'shared/sidebar.html');   // 👈 relativo a /public
  wireUI();
})();

/** Render topbar */
(async function renderTopbar() {
  const top = document.getElementById('topbar-root');
  if (!top) return;
  await includeInto(top, 'shared/topbar.html');     // 👈 relativo a /public
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

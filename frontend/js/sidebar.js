// js/sidebar.js
// Inserta el include flotante en #sidebar-root y marca activo por pathname.

const root = document.querySelector('#sidebar-root');
if (!root) {
  console.warn('[sidebar] Falta <div id="sidebar-root"></div> en esta página.');
} else {
  const BASE = new URL('.', window.location.href).pathname.replace(/\/+$/, '/') || '/';
  const candidates = [
    '/frontend/partials/sidebar.html', // absoluto (ajusta si cambias carpeta)
    `${window.location.origin}/ohmypet/frontend/partials/sidebar.html`,
    './partials/sidebar.html',
    BASE + 'partials/sidebar.html',
    '../partials/sidebar.html',
  ];

  (async () => {
    let html = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) continue;
        html = await res.text();
        break;
      } catch (_) {}
    }

    if (!html) {
      root.innerHTML = `
        <div class="fixed left-4 top-4 z-50 m-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 shadow">
          No se pudo cargar la barra lateral (partials/sidebar.html).
        </div>`;
      return;
    }

    root.innerHTML = html;

    // Marca activo según la URL actual
    const path = location.pathname;
    root.querySelectorAll('#sidebar-nav .nav-link').forEach(a => {
      const key = a.getAttribute('data-key');
      const isActive =
        (key === 'dashboard'  && /\/pages\/dashboard\.html$/i.test(path)) ||
        (key === 'inventario' && /\/pages\/inventario\.html$/i.test(path));
      a.classList.toggle('active', isActive);
    });
  })();
}

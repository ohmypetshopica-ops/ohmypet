// frontend/js/router.js
// Router con rutas RELATIVAS y manejo de errores visible en consola.

const viewRoot = document.querySelector('#view-root');
const sidebar = document.querySelector('#sidebar-nav');

// Base absoluta del dashboard, p.ej. /ohmypet/frontend/
const BASE = new URL('.', window.location.href).pathname;

// Config de rutas
let routes = {};

export function initRouter(config) {
  routes = config;
  window.addEventListener('hashchange', onRouteChange);

  // Marcar activo en sidebar al hacer click
  sidebar?.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (!a) return;
    setActive(a.getAttribute('href'));
  });
}

export function navigateTo(hash) {
  location.hash = hash;
}

async function onRouteChange() {
  const hash = location.hash || '#/dashboard';
  const route = routes[hash];
  if (!route) {
    console.warn('Ruta no encontrada:', hash);
    return;
  }

  try {
    // 1) Cargar la vista parcial con RUTA RELATIVA al dashboard.html
    const viewUrl = BASE + route.view; // ej: BASE:/ohmypet/frontend/ + 'views/dashboard.html'
    const html = await fetch(viewUrl, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar la vista: ${viewUrl} (${r.status})`);
      return r.text();
    });
    viewRoot.innerHTML = html;

    // 2) Activar link
    setActive(hash);

    // 3) Cargar el controlador (ESM dinámico)
    const controllerModule = await route.controller();
    if (controllerModule && typeof controllerModule.default === 'function') {
      await controllerModule.default(); // init()
    }
  } catch (err) {
    console.error('Router error:', err);
    viewRoot.innerHTML = `
      <div class="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
        <p class="font-semibold">No se pudo cargar esta vista.</p>
        <p class="text-sm mt-1">${String(err.message || err)}</p>
      </div>`;
  }
}

function setActive(hash) {
  document.querySelectorAll('#sidebar-nav .nav-link').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });
}

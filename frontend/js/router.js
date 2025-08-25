// frontend/js/router.js
const viewRoot = document.querySelector('#view-root');
const sidebar = document.querySelector('#sidebar-nav');

let routes = {};

export function initRouter(config) {
  routes = config;
  window.addEventListener('hashchange', onRouteChange);
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
  if (!route) return;

  // Cargar vista parcial
  const html = await fetch(route.view, { cache: 'no-cache' }).then(r => r.text());
  viewRoot.innerHTML = html;

  // Activar link
  setActive(hash);

  // Cargar controlador
  const mod = await route.controller();
  if (mod && typeof mod.default === 'function') {
    await mod.default(); // init()
  }
}

function setActive(hash) {
  document.querySelectorAll('#sidebar-nav .nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });
}

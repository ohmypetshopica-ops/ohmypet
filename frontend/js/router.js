// frontend/js/router.js
const viewRoot = document.querySelector('#view-root');
const sidebar = document.querySelector('#sidebar-nav');

// Carpeta base de dashboard.html, p.ej. /ohmypet/frontend/
const BASE = new URL('.', window.location.href).pathname.replace(/\/+$/, '/') || '/';

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
  if (!route) {
    viewRoot.innerHTML = errorBox(`Ruta no registrada: <code>${hash}</code>`);
    return;
  }

  // 🔧 Normaliza (quita slash inicial si lo tuviera)
  const viewPath = String(route.view || '').replace(/^\/+/, '');
  const candidates = [
    viewPath,                           // "views/dashboard.html"
    './' + viewPath,                    // "./views/dashboard.html"
    BASE + viewPath,                    // "/ohmypet/frontend/views/dashboard.html"
  ];

  let html = null, lastErr = null, usedUrl = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      html = await res.text();
      usedUrl = url;
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!html) {
    viewRoot.innerHTML = errorBox(
      `No se pudo cargar la vista <code>${viewPath}</code>.`,
      `Probé: <code>${candidates.join('</code>, <code>')}</code><br>Último error: ${String(lastErr)}`
    );
    console.error('Router fetch error:', lastErr);
    return;
  }

  viewRoot.innerHTML = html;
  setActive(hash);

  try {
    const mod = await route.controller();
    if (mod && typeof mod.default === 'function') {
      await mod.default(); // init()
    }
  } catch (e) {
    viewRoot.insertAdjacentHTML('afterbegin', errorBox(
      'El controlador de esta vista falló al inicializar.',
      String(e?.message || e)
    ));
    console.error('Controller error:', e, 'URL vista usada:', usedUrl);
  }
}

function setActive(hash) {
  document.querySelectorAll('#sidebar-nav .nav-link').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });
}

function errorBox(title, details = '') {
  return `
    <div class="mb-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">
      <p class="font-semibold">${title}</p>
      ${details ? `<p class="text-sm mt-1">${details}</p>` : ''}
    </div>
  `;
}

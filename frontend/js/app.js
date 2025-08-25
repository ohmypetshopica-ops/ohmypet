// frontend/js/app.js
import { supabase } from '../supabase-client.js';
import { getUserRole } from './models/userRoles.model.js';
import { initRouter, navigateTo } from './router.js';

const dashboardContainer = document.querySelector('#dashboard-container');
const mobileBlocker = document.querySelector('#mobile-blocker');

try {
  if (window.innerWidth < 768) {
    mobileBlocker.classList.remove('hidden');
  } else {
    dashboardContainer.classList.remove('hidden');
  }
} catch (e) {
  console.error('Error mostrando shell:', e);
  dashboardContainer?.classList.remove('hidden');
}

async function guard() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }

    const role = await getUserRole(session.user.id);
    if (!role || !['dueno', 'empleado'].includes(role)) {
      window.location.href = 'login.html';
      return null;
    }

    const welcome = document.querySelector('#welcome-message');
    if (welcome) welcome.textContent = `Bienvenido, ${session.user.email}`;

    supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT' || !s) window.location.href = 'login.html';
    });

    return { session, role };
  } catch (err) {
    console.error('Guard error:', err);
    const viewRoot = document.querySelector('#view-root');
    viewRoot.innerHTML = `
      <div class="p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
        <p class="font-semibold">No se pudo verificar tu sesión.</p>
        <p class="text-sm mt-1">${String(err.message || err)}</p>
      </div>`;
    return null;
  }
}

(async () => {
  const auth = await guard();
  if (!auth) return;

  initRouter({
    '#/dashboard': {
      view: 'views/dashboard.html',
      controller: () => import('./controllers/dashboard.controller.js'),
    },
    '#/inventario': {
      view: 'views/inventario.html',
      controller: () => import('./controllers/inventario.controller.js'),
    },
  });

  if (!location.hash) navigateTo('#/dashboard');
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
})();

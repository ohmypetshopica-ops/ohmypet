// frontend/js/app.js
import { supabase } from '../supabase-client.js';
import { getUserRole } from './models/userRoles.model.js';
import { initRouter, navigateTo } from './router.js';

// Mostrar/ocultar por dispositivo
const dashboardContainer = document.querySelector('#dashboard-container');
const mobileBlocker = document.querySelector('#mobile-blocker');
if (window.innerWidth < 768) {
  mobileBlocker.classList.remove('hidden');
} else {
  dashboardContainer.classList.remove('hidden');
}

// Auth guard + rol guard
async function guard() {
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

  // Bienvenida
  const welcome = document.querySelector('#welcome-message');
  if (welcome) welcome.textContent = `Bienvenido, ${session.user.email}`;

  // Redirección si cambia sesión
  supabase.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_OUT' || !s) window.location.href = 'login.html';
  });

  return { session, role };
}

(async () => {
  const auth = await guard();
  if (!auth) return;

  // Router
  initRouter({
    '#/dashboard': {
      view: '/views/dashboard.html',
      controller: () => import('./controllers/dashboard.controller.js')
    },
    '#/inventario': {
      view: '/views/inventario.html',
      controller: () => import('./controllers/inventario.controller.js')
    }
  });

  // Navegación inicial
  if (!location.hash) navigateTo('#/dashboard');
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
})();

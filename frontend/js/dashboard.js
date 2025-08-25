// frontend/js/dashboard.js
import { supabase } from '../supabase-client.js';

const dashboardContainer = document.querySelector('#dashboard-container');
const mobileBlocker = document.querySelector('#mobile-blocker');
const welcomeMessage = document.querySelector('#welcome-message');

// Mostrar bloqueador si es móvil
if (window.innerWidth < 768) {
  mobileBlocker.classList.remove('hidden');
} else {
  dashboardContainer.classList.remove('hidden');
}

async function checkAccess() {
  // 1. Verificar sesión activa
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    window.location.href = 'login.html';
    return;
  }

  const user = session.user;

  // 2. Consultar rol del usuario
  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || !roles) {
    window.location.href = 'login.html';
    return;
  }

  // 3. Validar rol permitido
  if (roles.role !== 'dueno' && roles.role !== 'empleado') {
    window.location.href = 'login.html';
    return;
  }

  // 4. Bienvenida
  welcomeMessage.textContent = `Bienvenido, ${user.email}`;

  // 5. Cargar métricas
  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    // Ventas del mes
    const { data: ventas } = await supabase
      .from('ventas')
      .select('total, fecha')
      .gte('fecha', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const totalVentas = ventas?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
    document.querySelector('#ventas-mes').textContent = totalVentas.toFixed(2);

    // Citas programadas
    const { data: citas } = await supabase
      .from('citas')
      .select('id')
      .gte('fecha', new Date().toISOString());

    document.querySelector('#citas-programadas').textContent = citas?.length || 0;

    // Clientes nuevos del mes
    const { data: clientes } = await supabase
      .from('auth.users')
      .select('id, created_at')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    document.querySelector('#clientes-nuevos').textContent = clientes?.length || 0;

    // Productos con stock bajo
    const { data: productos } = await supabase
      .from('productos')
      .select('id, stock')
      .lt('stock', 5);

    document.querySelector('#stock-bajo').textContent = productos?.length || 0;
  } catch (err) {
    console.error('Error cargando dashboard:', err);
  }
}

// Redirigir si cambia el estado de sesión
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    window.location.href = 'login.html';
  }
});

checkAccess();

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
    alert('No tienes permisos para acceder al dashboard.');
    window.location.href = 'login.html';
    return;
  }

  // 3. Validar rol permitido
  if (roles.role !== 'dueno' && roles.role !== 'empleado') {
    alert('Acceso restringido.');
    window.location.href = 'login.html';
    return;
  }

  // 4. Bienvenida
  welcomeMessage.textContent = `Bienvenido, ${user.email}`;

  // 5. Cargar métricas dinámicas
  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    // Total ventas del mes
    const { data: ventas, error: ventasError } = await supabase
      .from('ventas')
      .select('total, fecha')
      .gte(
        'fecha',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      );

    if (ventasError) throw ventasError;
    const totalVentas = ventas?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
    document.querySelector('#dashboard-view .grid div:nth-child(1) p.text-2xl').textContent =
      `S/ ${totalVentas.toFixed(2)}`;

    // Citas programadas
    const { data: citas, error: citasError } = await supabase
      .from('citas')
      .select('id')
      .gte('fecha', new Date().toISOString());

    if (citasError) throw citasError;
    document.querySelector('#dashboard-view .grid div:nth-child(2) p.text-2xl').textContent =
      citas.length;

    // Clientes nuevos este mes
    const { data: clientes, error: clientesError } = await supabase
      .from('auth.users')
      .select('id, created_at')
      .gte(
        'created_at',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      );

    if (clientesError) throw clientesError;
    document.querySelector('#dashboard-view .grid div:nth-child(3) p.text-2xl').textContent =
      clientes.length;

    // Productos con stock bajo (<5)
    const { data: productos, error: productosError } = await supabase
      .from('productos')
      .select('id, stock')
      .lt('stock', 5);

    if (productosError) throw productosError;
    document.querySelector('#dashboard-view .grid div:nth-child(4) p.text-2xl').textContent =
      productos.length;
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

// controllers/dashboard.page.controller.js
import { supabase } from '../../supabase-client.js';
import { getCitasProgramadas } from '../models/citas.model.js';
import { getStockBajo } from '../models/productos.model.js';
import { getUserRole } from '../models/userRoles.model.js';

async function guard() {
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) { 
    window.location.href = `${window.location.origin}/ohmypet/frontend/login.html`; 
    return null; 
  }
  const role = await getUserRole(session.user.id);
  if (!role || !['dueno','empleado'].includes(role)) {
    window.location.href = `${window.location.origin}/ohmypet/frontend/login.html`;
    return null;
  }
  const welcome = document.querySelector('#welcome-message');
  if (welcome) welcome.textContent = `Bienvenido, ${session.user.email}`;
  supabase.auth.onAuthStateChange((event)=>{ 
    if(event==='SIGNED_OUT') window.location.href = `${window.location.origin}/ohmypet/frontend/login.html`;
  });
  return { session, role };
}

async function loadMetrics() {
  const ventasEl   = document.querySelector('#ventas-mes');
  const citasEl    = document.querySelector('#citas-programadas');
  const clientesEl = document.querySelector('#clientes-nuevos');
  const stockEl    = document.querySelector('#stock-bajo');
  if (!ventasEl||!citasEl||!clientesEl||!stockEl) return;

  // CÁLCULO DE VENTAS AHORA DESDE LA TABLA DE PEDIDOS
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: pedidosMes, error: ventasError } = await supabase
    .from('pedidos')
    .select('total')
    .gte('created_at', inicioMes);
  
  if (ventasError) console.error(ventasError);
  const totalVentas = (pedidosMes || []).reduce((sum, pedido) => sum + (pedido.total || 0), 0);
  ventasEl.textContent = totalVentas.toFixed(2);

  const citas  = await getCitasProgramadas(); citasEl.textContent = citas;

  const { data: clientesRoles, error } = await supabase.from('user_roles')
    .select('id').eq('role','cliente').gte('created_at', inicioMes);
  if (error) console.error(error);
  clientesEl.textContent = clientesRoles?.length ?? 0;

  const bajo = await getStockBajo(5); stockEl.textContent = bajo;
}

// --- NUEVA FUNCIÓN PARA CARGAR PEDIDOS ---
async function loadRecentActivity() {
    const list = document.querySelector('#recent-activity-list');
    const indicator = document.querySelector('#loading-indicator');
    if (!list || !indicator) return;

    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('codigo_pedido, cliente_nombre, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    indicator.classList.add('hidden'); // Oculta el "Cargando..."

    if (error) {
        list.innerHTML = '<li>Error al cargar la actividad.</li>';
        console.error(error);
        return;
    }

    if (pedidos.length === 0) {
        list.innerHTML = '<li>Aún no hay pedidos.</li>';
        return;
    }

    list.innerHTML = pedidos.map(pedido => `
        <li class="py-3 flex items-center justify-between">
            <div class="flex items-center">
                <span class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-sky-600 mr-3">
                    <ion-icon name="bag-handle-outline" class="text-xl"></ion-icon>
                </span>
                <div>
                    <p class="font-medium text-slate-800">Nuevo pedido de <span class="text-sky-700">${pedido.cliente_nombre || 'Cliente'}</span></p>
                    <p class="text-xs text-slate-500">Pedido #${pedido.codigo_pedido}</p>
                </div>
            </div>
            <span class="text-xs text-slate-500">${new Date(pedido.created_at).toLocaleString('es-PE')}</span>
        </li>
    `).join('');
}


export async function initDashboardPage(){
  const ok = await guard(); 
  if(!ok) return;
  await loadMetrics();
  await loadRecentActivity(); // Llamamos a la nueva función
}
// controllers/dashboard.page.controller.js
import { supabase } from '../../supabase-client.js';
import { getVentasDelMes } from '../models/ventas.model.js';
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

  const ventas = await getVentasDelMes(); ventasEl.textContent = ventas.toFixed(2);
  const citas  = await getCitasProgramadas(); citasEl.textContent = citas;

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: clientesRoles, error } = await supabase.from('user_roles')
    .select('id').eq('role','cliente').gte('created_at', inicioMes);
  if (error) console.error(error);
  clientesEl.textContent = clientesRoles?.length ?? 0;

  const bajo = await getStockBajo(5); stockEl.textContent = bajo;
}

export async function initDashboardPage(){
  const ok = await guard(); 
  if(!ok) return;
  await loadMetrics();
}

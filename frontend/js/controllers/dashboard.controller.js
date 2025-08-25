// frontend/js/controllers/dashboard.controller.js
import { getVentasDelMes } from '../models/ventas.model.js';
import { getCitasProgramadas } from '../models/citas.model.js';
import { getStockBajo } from '../models/productos.model.js';
import { supabase } from '../../supabase-client.js';

export default async function init() {
  // refs seguras
  const ventasEl = document.querySelector('#ventas-mes');
  const citasEl = document.querySelector('#citas-programadas');
  const clientesEl = document.querySelector('#clientes-nuevos');
  const stockEl = document.querySelector('#stock-bajo');

  if (!ventasEl || !citasEl || !clientesEl || !stockEl) {
    console.warn('dashboard.controller: Elements not found. ¿Se cargó la vista dashboard.html?');
    return;
  }

  try {
    // Ventas del mes
    const ventas = await getVentasDelMes();
    ventasEl.textContent = ventas.toFixed(2);

    // Citas programadas
    const citas = await getCitasProgramadas();
    citasEl.textContent = citas;

    // Clientes nuevos del mes
    const { data: clientes, error } = await supabase
      .from('auth.users')
      .select('id, created_at')
      .gte(
        'created_at',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      );
    if (error) throw error;
    clientesEl.textContent = clientes?.length ?? 0;

    // Stock bajo
    const bajo = await getStockBajo(5);
    stockEl.textContent = bajo;
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

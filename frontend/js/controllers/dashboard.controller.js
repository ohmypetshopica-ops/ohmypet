// frontend/js/controllers/dashboard.controller.js
import { getVentasDelMes } from '../models/ventas.model.js';
import { getCitasProgramadas } from '../models/citas.model.js';
import { getStockBajo } from '../models/productos.model.js';
import { supabase } from '../../supabase-client.js';

export default async function init() {
  try {
    // Ventas del mes
    const ventas = await getVentasDelMes();
    document.querySelector('#ventas-mes').textContent = ventas.toFixed(2);

    // Citas programadas
    const citas = await getCitasProgramadas();
    document.querySelector('#citas-programadas').textContent = citas;

    // Clientes nuevos del mes
    const { data: clientes, error } = await supabase
      .from('auth.users')
      .select('id, created_at')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
    if (error) throw error;
    document.querySelector('#clientes-nuevos').textContent = clientes?.length ?? 0;

    // Stock bajo
    const bajo = await getStockBajo(5);
    document.querySelector('#stock-bajo').textContent = bajo;
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

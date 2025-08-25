// frontend/js/models/ventas.model.js
import { supabase } from '../../supabase-client.js';

export async function getVentasDelMes() {
  const desde = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data, error } = await supabase
    .from('ventas')
    .select('total, fecha')
    .gte('fecha', desde);
  if (error) throw error;
  const total = data?.reduce((s, v) => s + (v.total || 0), 0) ?? 0;
  return total;
}

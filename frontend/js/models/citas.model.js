// frontend/js/models/citas.model.js
import { supabase } from '../../supabase-client.js';

export async function getCitasProgramadas() {
  const { data, error } = await supabase
    .from('citas')
    .select('id')
    .gte('fecha', new Date().toISOString());

  if (error) throw error;
  return data?.length ?? 0;
}

import { supabase } from '../../supabase-client.js';
export async function getUserRole(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('Error role:', error.message); return null; }
  return data?.role ?? null;
}

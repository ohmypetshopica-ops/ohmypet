// assets/js/modules/usuarios.js
import { supabase } from '../supabaseClient.js';
import { qs, renderTable, formToObject, confirmDialog } from '../utils.js';

export async function initUsuarios() {
  await loadUsers();
  qs('#form-role').addEventListener('submit', saveRole);
}

async function loadUsers() {
  // Nota: auth.users sólo es accesible vía rpc o con servicio; aquí leeremos user_roles (vista básica).
  const { data, error } = await supabase.from('user_roles').select('id,user_id,role,created_at').order('created_at', { ascending: false });
  if (error) return alert(error.message);
  renderTable(qs('#tbody'), data ?? [], ['user_id','role','created_at'], {
    del: async (id) => {
      if (!(await confirmDialog('¿Eliminar rol?'))) return;
      const { error } = await supabase.from('user_roles').delete().eq('id', id);
      if (error) return alert(error.message);
      loadUsers();
    }
  });
}

async function saveRole(e) {
  e.preventDefault();
  const payload = formToObject(e.target);
  const { error } = await supabase.from('user_roles').insert(payload);
  if (error) return alert(error.message);
  e.target.reset();
  loadUsers();
}

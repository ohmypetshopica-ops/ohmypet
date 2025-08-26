// assets/js/modules/mascotas.js
import { supabase } from '../supabaseClient.js';
import { qs, renderTable, formToObject, setForm, confirmDialog } from '../utils.js';

let editingId = null;

export async function initMascotas() {
  qs('#btn-search').addEventListener('click', load);
  qs('#form').addEventListener('submit', save);
  qs('#btn-cancel').addEventListener('click', resetForm);
  await load();
}

async function load() {
  const q = qs('#q').value.trim();
  let query = supabase.from('mascotas').select('*').order('created_at', { ascending: false });
  if (q) query = query.ilike('nombre', `%${q}%`);
  const { data, error } = await query;
  if (error) return alert(error.message);
  renderTable(qs('#tbody'), data ?? [], ['nombre','especie','raza','edad','peso','notas'], { edit: startEdit, del: delRow });
}

async function save(e) {
  e.preventDefault();
  const payload = formToObject(e.target);
  let res;
  if (editingId) res = await supabase.from('mascotas').update(payload).eq('id', editingId).select().single();
  else res = await supabase.from('mascotas').insert(payload).select().single();
  if (res.error) return alert(res.error.message);
  resetForm(); load();
}

function startEdit(id) {
  editingId = id;
  supabase.from('mascotas').select('*').eq('id', id).single().then(({ data, error })=>{
    if (error) return alert(error.message);
    setForm(qs('#form'), data);
    qs('#form-title').textContent = 'Editar mascota';
    qs('#btn-submit').textContent = 'Guardar';
    qs('#btn-cancel').classList.remove('hidden');
  });
}

async function delRow(id) {
  if (!(await confirmDialog('¿Eliminar mascota?'))) return;
  const { error } = await supabase.from('mascotas').delete().eq('id', id);
  if (error) return alert(error.message);
  load();
}

function resetForm() {
  editingId = null;
  qs('#form').reset();
  qs('#form-title').textContent = 'Nueva mascota';
  qs('#btn-submit').textContent = 'Crear';
  qs('#btn-cancel').classList.add('hidden');
}

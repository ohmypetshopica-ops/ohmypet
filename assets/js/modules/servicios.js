// assets/js/modules/servicios.js
import { supabase } from '../supabaseClient.js';
import { qs, renderTable, formToObject, setForm, confirmDialog } from '../utils.js';

let editingId = null;

export async function initServicios() {
  qs('#btn-search').addEventListener('click', load);
  qs('#form').addEventListener('submit', save);
  qs('#btn-cancel').addEventListener('click', resetForm);
  await load();
}

async function load() {
  const q = qs('#q').value.trim();
  let query = supabase.from('servicios').select('*').order('created_at', { ascending: false });
  if (q) query = query.ilike('nombre', `%${q}%`);
  const { data, error } = await query;
  if (error) return alert(error.message);
  renderTable(qs('#tbody'), data ?? [], ['nombre','descripcion','duracion_min','precio','activo'], { edit: startEdit, del: delRow });
}

async function save(e) {
  e.preventDefault();
  const payload = formToObject(e.target);
  payload.duracion_min = payload.duracion_min ? Number(payload.duracion_min) : null;
  let res;
  if (editingId) res = await supabase.from('servicios').update(payload).eq('id', editingId).select().single();
  else res = await supabase.from('servicios').insert(payload).select().single();
  if (res.error) return alert(res.error.message);
  resetForm(); load();
}

function startEdit(id) {
  editingId = id;
  supabase.from('servicios').select('*').eq('id', id).single().then(({ data, error })=>{
    if (error) return alert(error.message);
    setForm(qs('#form'), data);
    qs('#form-title').textContent = 'Editar servicio';
    qs('#btn-submit').textContent = 'Guardar';
    qs('#btn-cancel').classList.remove('hidden');
    qs('select[name="activo"]').value = data.activo ? '1' : '0';
  });
}

async function delRow(id) {
  if (!(await confirmDialog('¿Eliminar servicio?'))) return;
  const { error } = await supabase.from('servicios').delete().eq('id', id);
  if (error) return alert(error.message);
  load();
}

function resetForm() {
  editingId = null;
  qs('#form').reset();
  qs('#form-title').textContent = 'Nuevo servicio';
  qs('#btn-submit').textContent = 'Crear';
  qs('#btn-cancel').classList.add('hidden');
}

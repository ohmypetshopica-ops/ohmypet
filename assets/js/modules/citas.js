// assets/js/modules/citas.js
import { supabase } from '../supabaseClient.js';
import { qs, renderTable, formToObject, setForm, confirmDialog } from '../utils.js';

let editingId = null;

export async function initCitas() {
  qs('#btn-search').addEventListener('click', load);
  qs('#form').addEventListener('submit', save);
  qs('#btn-cancel').addEventListener('click', resetForm);
  await load();
  await loadHorarios();
}

async function load() {
  const q = qs('#q').value.trim();
  let query = supabase.from('citas').select('*').order('created_at', { ascending: false });
  if (q) query = query.ilike('estado', `%${q}%`);
  const { data, error } = await query;
  if (error) return alert(error.message);
  renderTable(qs('#tbody'), data ?? [], ['fecha','hora_inicio','hora_fin','estado','notas'], { edit: startEdit, del: delRow });
}

async function loadHorarios() {
  const { data } = await supabase.from('horarios_disponibles').select('*').eq('activo', true).order('dia_semana');
  const el = qs('#horarios');
  el.innerHTML = (data ?? []).map(h => `
    <div class="text-xs px-2 py-1 border rounded">${h.dia_semana} ${h.hora_inicio}–${h.hora_fin}</div>
  `).join('');
}

async function save(e) {
  e.preventDefault();
  const payload = formToObject(e.target);
  let res;
  if (editingId) res = await supabase.from('citas').update(payload).eq('id', editingId).select().single();
  else res = await supabase.from('citas').insert(payload).select().single();
  if (res.error) return alert(res.error.message);
  resetForm(); load();
}

function startEdit(id) {
  editingId = id;
  supabase.from('citas').select('*').eq('id', id).single().then(({ data, error })=>{
    if (error) return alert(error.message);
    setForm(qs('#form'), data);
    qs('#form-title').textContent = 'Editar cita';
    qs('#btn-submit').textContent = 'Guardar';
    qs('#btn-cancel').classList.remove('hidden');
  });
}

async function delRow(id) {
  if (!(await confirmDialog('¿Eliminar cita?'))) return;
  const { error } = await supabase.from('citas').delete().eq('id', id);
  if (error) return alert(error.message);
  load();
}

function resetForm() {
  editingId = null;
  qs('#form').reset();
  qs('#form-title').textContent = 'Nueva cita';
  qs('#btn-submit').textContent = 'Crear';
  qs('#btn-cancel').classList.add('hidden');
}

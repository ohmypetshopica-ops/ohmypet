// assets/js/modules/pedidos.js
import { supabase } from '../supabaseClient.js';
import { qs, renderTable, formToObject, setForm, confirmDialog } from '../utils.js';

let editingId = null;

export async function initPedidos() {
  qs('#btn-search').addEventListener('click', load);
  qs('#form').addEventListener('submit', save);
  qs('#btn-cancel').addEventListener('click', resetForm);
  qs('#form-item').addEventListener('submit', saveItem);
  await load();
  await loadProductosSelect();
}

async function load() {
  const q = qs('#q').value.trim();
  let query = supabase.from('pedidos').select('*').order('created_at', { ascending: false });
  if (q) query = query.ilike('cliente_nombre', `%${q}%`);
  const { data, error } = await query;
  if (error) return alert(error.message);
  renderTable(qs('#tbody'), data ?? [], ['codigo_pedido','cliente_nombre','cliente_email','total','created_at'], { edit: startEdit, del: delRow });
}

async function loadProductosSelect() {
  const { data } = await supabase.from('productos').select('id,nombre,precio').order('nombre');
  const sel = qs('#producto_id');
  sel.innerHTML = data?.map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre}</option>`).join('') ?? '';
}

async function save(e) {
  e.preventDefault();
  const payload = formToObject(e.target);
  let res;
  if (editingId) res = await supabase.from('pedidos').update(payload).eq('id', editingId).select().single();
  else res = await supabase.from('pedidos').insert(payload).select().single();
  if (res.error) return alert(res.error.message);
  resetForm(); load();
}

function startEdit(id) {
  editingId = id;
  supabase.from('pedidos').select('*').eq('id', id).single().then(({ data, error })=>{
    if (error) return alert(error.message);
    setForm(qs('#form'), data);
    qs('#form-title').textContent = 'Editar pedido';
    qs('#btn-submit').textContent = 'Guardar';
    qs('#btn-cancel').classList.remove('hidden');
    loadItems(id);
  });
}

async function loadItems(pedidoId) {
  const { data, error } = await supabase.from('pedido_items').select('id,producto_id,cantidad,precio_unitario').eq('pedido_id', pedidoId);
  if (error) return alert(error.message);
  const tbody = qs('#tbody-items');
  tbody.innerHTML = '';
  for (const it of (data ?? [])) {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    tr.innerHTML = `
      <td class="p-2 text-sm">${it.producto_id}</td>
      <td class="p-2 text-sm">${it.cantidad}</td>
      <td class="p-2 text-sm">${it.precio_unitario}</td>
      <td class="p-2 text-sm"><button data-del-item="${it.id}" class="px-2 py-1 border rounded">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  }
  qsa('[data-del-item]').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmDialog('¿Eliminar ítem?'))) return;
    const { error } = await supabase.from('pedido_items').delete().eq('id', b.dataset.delItem);
    if (error) return alert(error.message);
    loadItems(pedidoId);
  }));
}

async function saveItem(e) {
  e.preventDefault();
  if (!editingId) { alert('Primero guarda/selecciona un pedido.'); return; }
  const payload = formToObject(e.target);
  payload.pedido_id = editingId;
  const { error } = await supabase.from('pedido_items').insert(payload);
  if (error) return alert(error.message);
  e.target.reset();
  loadItems(editingId);
}

async function delRow(id) {
  if (!(await confirmDialog('¿Eliminar pedido?'))) return;
  const { error } = await supabase.from('pedidos').delete().eq('id', id);
  if (error) return alert(error.message);
  load();
}

function resetForm() {
  editingId = null;
  qs('#form').reset();
  qs('#form-title').textContent = 'Nuevo pedido';
  qs('#btn-submit').textContent = 'Crear';
  qs('#btn-cancel').classList.add('hidden');
  qs('#tbody-items').innerHTML = '';
}

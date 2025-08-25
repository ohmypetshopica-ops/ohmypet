// controllers/inventario.page.controller.js
import { getUserRole } from '../models/userRoles.model.js';
import {
  listProductos, getProducto, createProducto, updateProducto, deleteProducto,
} from '../models/productos.model.js';
import { supabase } from '../../supabase-client.js';

async function guard() {
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) { window.location.href='/frontend/login.html'; return null; }
  const role = await getUserRole(session.user.id);
  if (!role || !['dueno','empleado'].includes(role)) {
    window.location.href='/frontend/login.html'; return null;
  }
  const welcome = document.querySelector('#welcome-message');
  if (welcome) welcome.textContent = `Bienvenido, ${session.user.email}`;
  supabase.auth.onAuthStateChange((event)=>{ if(event==='SIGNED_OUT') location.href='/frontend/login.html';});
  return { session, role };
}

function rowHTML(p){
  return `
    <tr>
      <td class="px-5 py-3">${p.nombre}</td>
      <td class="px-5 py-3">S/ ${Number(p.precio).toFixed(2)}</td>
      <td class="px-5 py-3">${p.stock}</td>
      <td class="px-5 py-3">${
        p.stock>0
          ? '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Disponible</span>'
          : '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-100">Agotado</span>'
      }</td>
      <td class="px-5 py-3 space-x-2">
        <button class="edit bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg" data-id="${p.id}">Editar</button>
        <button class="del bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>
  `;
}

async function loadTable() {
  const tbody = document.querySelector('#products-table-body');
  const empty = document.querySelector('#empty-state');
  const productos = await listProductos();
  tbody.innerHTML = productos.map(rowHTML).join('');
  empty?.classList.toggle('hidden', productos.length>0);

  tbody.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
  tbody.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => onDelete(b.dataset.id)));
}

let editingId = null;

async function openEdit(id){
  const p = await getProducto(id);
  editingId = id;
  document.querySelector('#modal-title').textContent = 'Editar Producto';
  document.querySelector('#product-id').value = id;
  document.querySelector('#product-name').value  = p.nombre ?? '';
  document.querySelector('#product-price').value = p.precio ?? 0;
  document.querySelector('#product-stock').value = p.stock ?? 0;
  document.querySelector('#product-image').value = p.imagen_url ?? '';
  document.querySelector('#product-modal').classList.remove('hidden');
}
function openNew(){
  editingId = null;
  document.querySelector('#modal-title').textContent = 'Agregar Producto';
  document.querySelector('#product-id').value = '';
  document.querySelector('#product-form').reset();
  document.querySelector('#product-modal').classList.remove('hidden');
}
function closeModal(){
  document.querySelector('#product-modal').classList.add('hidden');
}
async function onDelete(id){
  if(!confirm('¿Eliminar producto?')) return;
  await deleteProducto(id);
  await loadTable();
}
async function onSubmit(e){
  e.preventDefault();
  const payload = {
    nombre: document.querySelector('#product-name').value.trim(),
    precio: Number(document.querySelector('#product-price').value),
    stock:  Number(document.querySelector('#product-stock').value),
    imagen_url: document.querySelector('#product-image').value.trim() || null,
  };
  if (editingId) await updateProducto(editingId, payload);
  else await createProducto(payload);
  closeModal();
  await loadTable();
}

export async function initInventarioPage(){
  const ok = await guard(); if(!ok) return;
  await loadTable();

  document.querySelector('#add-product-btn')?.addEventListener('click', openNew);
  document.querySelector('#cancel-btn')?.addEventListener('click', closeModal);
  document.querySelector('#cancel-btn-2')?.addEventListener('click', closeModal);
  document.querySelector('#product-form')?.addEventListener('submit', onSubmit);
}

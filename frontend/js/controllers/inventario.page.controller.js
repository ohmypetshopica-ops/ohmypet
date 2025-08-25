// controllers/inventario.page.controller.js
import { getUserRole } from '../models/userRoles.model.js';
import {
  listProductos, getProducto, createProducto, updateProducto,
} from '../models/productos.model.js';
import { supabase } from '../../supabase-client.js';

async function guard() {
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) { 
    window.location.href = `${window.location.origin}/ohmypet/frontend/login.html`;
    return null; 
  }
  const role = await getUserRole(session.user.id);
  if (!role || !['dueno','empleado'].includes(role)) {
    window.location.href = `${window.location.origin}/ohmypet/frontend/login.html`;
    return null;
  }
  const welcome = document.querySelector('#welcome-message');
  if (welcome) welcome.textContent = `Bienvenido, ${session.user.email}`;
  supabase.auth.onAuthStateChange((event)=>{ 
    if(event==='SIGNED_OUT') window.location.href = `${window.location.origin}/ohmypet/frontend/login.html`;
  });
  return { session, role };
}

// --- FUNCIÓN DE RENDERIZADO DE FILA ACTUALIZADA ---
function rowHTML(p){
  const isEnabled = p.habilitado;
  
  const statusBadge = isEnabled
    ? '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Habilitado</span>'
    : '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-100">Deshabilitado</span>';

  const toggleButton = isEnabled
    ? `<button class="toggle-status bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg" data-id="${p.id}">Deshabilitar</button>`
    : `<button class="toggle-status bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg" data-id="${p.id}">Habilitar</button>`;

  // --- N U E V A   L Ó G I C A: Indicador de Stock ---
  let stockIndicator = '';
  if (p.stock < 10 && p.stock > 0) {
    stockIndicator = '<span class="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Bajo en Stock</span>';
  } else if (p.stock <= 0) {
    stockIndicator = '<span class="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">Agotado</span>';
  }

  return `
    <tr>
      <td class="px-5 py-3">${p.nombre}</td>
      <td class="px-5 py-3">S/ ${Number(p.precio).toFixed(2)}</td>
      <td class="px-5 py-3 flex items-center">${p.stock} ${stockIndicator}</td>
      <td class="px-5 py-3">${statusBadge}</td>
      <td class="px-5 py-3 space-x-2">
        <button class="edit bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg" data-id="${p.id}">Editar</button>
        ${toggleButton}
      </td>
    </tr>
  `;
}

async function onToggleStatus(id) {
    try {
        const producto = await getProducto(id);
        const nuevoEstado = !producto.habilitado;
        await updateProducto(id, { habilitado: nuevoEstado });
        await loadTable();
    } catch (error) {
        alert(`Error al cambiar el estado: ${error.message}`);
    }
}

async function loadTable() {
  const tbody = document.querySelector('#products-table-body');
  const empty = document.querySelector('#empty-state');
  const productos = await listProductos();
  tbody.innerHTML = productos.map(rowHTML).join('');
  empty?.classList.toggle('hidden', productos.length>0);

  tbody.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
  tbody.querySelectorAll('.toggle-status').forEach(b => b.addEventListener('click', () => onToggleStatus(b.dataset.id)));
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
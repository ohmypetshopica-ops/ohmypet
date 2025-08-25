// frontend/js/controllers/inventario.controller.js
import {
  listProductos,
  getProducto,
  createProducto,
  updateProducto,
  deleteProducto,
} from '../models/productos.model.js';

export default async function init() {
  // UI refs
  const tbody = document.querySelector('#products-table-body');
  const addBtn = document.querySelector('#add-product-btn');
  const modal = document.querySelector('#product-modal');
  const form = document.querySelector('#product-form');
  const cancel = document.querySelector('#cancel-btn');
  const title = document.querySelector('#modal-title');
  const idInput = document.querySelector('#product-id');
  const nameInput = document.querySelector('#product-name');
  const priceInput = document.querySelector('#product-price');
  const stockInput = document.querySelector('#product-stock');
  const imageInput = document.querySelector('#product-image');

  let editingId = null;

  async function load() {
    try {
      const productos = await listProductos();
      render(productos);
    } catch (e) {
      console.error('Inventario load error:', e);
    }
  }

  function render(rows) {
    tbody.innerHTML = '';
    rows.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-5 py-3">${p.nombre}</td>
        <td class="px-5 py-3">S/ ${Number(p.precio).toFixed(2)}</td>
        <td class="px-5 py-3">${p.stock}</td>
        <td class="px-5 py-3">${p.stock > 0 ? '<span class="text-green-600">Disponible</span>' : '<span class="text-red-600">Agotado</span>'}</td>
        <td class="px-5 py-3 space-x-2">
          <button class="edit bg-blue-500 text-white px-3 py-1 rounded" data-id="${p.id}">Editar</button>
          <button class="del bg-red-500 text-white px-3 py-1 rounded" data-id="${p.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.edit').forEach(b =>
      b.addEventListener('click', () => openEdit(b.dataset.id))
    );
    tbody.querySelectorAll('.del').forEach(b =>
      b.addEventListener('click', () => onDelete(b.dataset.id))
    );
  }

  function openNew() {
    editingId = null;
    title.textContent = 'Agregar Producto';
    idInput.value = '';
    form.reset();
    modal.classList.remove('hidden');
  }

  async function openEdit(id) {
    try {
      const p = await getProducto(id);
      editingId = id;
      title.textContent = 'Editar Producto';
      idInput.value = id;
      nameInput.value = p.nombre ?? '';
      priceInput.value = p.precio ?? 0;
      stockInput.value = p.stock ?? 0;
      imageInput.value = p.imagen_url ?? '';
      modal.classList.remove('hidden');
    } catch (e) {
      console.error('Open edit error:', e);
      alert('No se pudo cargar el producto.');
    }
  }

  async function onDelete(id) {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      await deleteProducto(id);
      await load();
    } catch (e) {
      console.error('Delete error:', e);
      alert('No se pudo eliminar.');
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const payload = {
      nombre: nameInput.value.trim(),
      precio: Number(priceInput.value),
      stock: Number(stockInput.value),
      imagen_url: imageInput.value.trim() || null,
    };

    try {
      if (editingId) await updateProducto(editingId, payload);
      else await createProducto(payload);
      modal.classList.add('hidden');
      await load();
    } catch (e) {
      console.error('Save error:', e);
      alert('No se pudo guardar el producto.');
    }
  }

  function closeModal() { modal.classList.add('hidden'); }

  // Bind
  addBtn?.addEventListener('click', openNew);
  cancel?.addEventListener('click', closeModal);
  form?.addEventListener('submit', onSubmit);

  // Start
  await load();
}

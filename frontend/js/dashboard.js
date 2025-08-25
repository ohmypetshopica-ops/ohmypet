// frontend/js/dashboard.js
import { supabase } from '../supabase-client.js';

const dashboardContainer = document.querySelector('#dashboard-container');
const mobileBlocker = document.querySelector('#mobile-blocker');
const welcomeMessage = document.querySelector('#welcome-message');

// Mostrar bloqueador si es móvil
if (window.innerWidth < 768) {
  mobileBlocker.classList.remove('hidden');
} else {
  dashboardContainer.classList.remove('hidden');
}

async function checkAccess() {
  // 1. Verificar sesión activa
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    window.location.href = 'login.html';
    return;
  }

  const user = session.user;

  // 2. Consultar rol del usuario
  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || !roles) {
    window.location.href = 'login.html';
    return;
  }

  // 3. Validar rol permitido
  if (roles.role !== 'dueno' && roles.role !== 'empleado') {
    window.location.href = 'login.html';
    return;
  }

  // 4. Bienvenida
  welcomeMessage.textContent = `Bienvenido, ${user.email}`;

  // 5. Cargar métricas
  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    // Ventas del mes
    const { data: ventas } = await supabase
      .from('ventas')
      .select('total, fecha')
      .gte('fecha', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const totalVentas = ventas?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
    document.querySelector('#ventas-mes').textContent = totalVentas.toFixed(2);

    // Citas programadas
    const { data: citas } = await supabase
      .from('citas')
      .select('id')
      .gte('fecha', new Date().toISOString());

    document.querySelector('#citas-programadas').textContent = citas?.length || 0;

    // Clientes nuevos del mes
    const { data: clientes } = await supabase
      .from('auth.users')
      .select('id, created_at')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    document.querySelector('#clientes-nuevos').textContent = clientes?.length || 0;

    // Productos con stock bajo
    const { data: productos } = await supabase
      .from('productos')
      .select('id, stock')
      .lt('stock', 5);

    document.querySelector('#stock-bajo').textContent = productos?.length || 0;
  } catch (err) {
    console.error('Error cargando dashboard:', err);
  }
}

// ---------------- INVENTARIO ----------------
const productsTableBody = document.querySelector('#products-table-body');
const addProductBtn = document.querySelector('#add-product-btn');
const productModal = document.querySelector('#product-modal');
const productForm = document.querySelector('#product-form');
const cancelBtn = document.querySelector('#cancel-btn');
const modalTitle = document.querySelector('#modal-title');

let editingId = null;

async function loadProducts() {
  const { data: productos, error } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error cargando productos:', error);
    return;
  }
  renderProducts(productos);
}

function renderProducts(productos) {
  productsTableBody.innerHTML = '';
  productos.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-5 py-3">${p.nombre}</td>
      <td class="px-5 py-3">S/ ${p.precio}</td>
      <td class="px-5 py-3">${p.stock}</td>
      <td class="px-5 py-3">${p.stock > 0 ? '<span class="text-green-600">Disponible</span>' : '<span class="text-red-600">Agotado</span>'}</td>
      <td class="px-5 py-3 space-x-2">
        <button class="edit-btn bg-blue-500 text-white px-3 py-1 rounded" data-id="${p.id}">Editar</button>
        <button class="delete-btn bg-red-500 text-white px-3 py-1 rounded" data-id="${p.id}">Eliminar</button>
      </td>
    `;
    productsTableBody.appendChild(tr);
  });

  // Listeners
  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(btn.dataset.id))
  );
  document.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id))
  );
}

// Abrir modal nuevo
addProductBtn?.addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Agregar Producto';
  productForm.reset();
  productModal.classList.remove('hidden');
});

// Cancelar modal
cancelBtn?.addEventListener('click', () => {
  productModal.classList.add('hidden');
});

// Guardar producto
productForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.querySelector('#product-name').value;
  const precio = parseFloat(document.querySelector('#product-price').value);
  const stock = parseInt(document.querySelector('#product-stock').value);
  const imagen_url = document.querySelector('#product-image').value;

  let result;
  if (editingId) {
    result = await supabase.from('productos').update({ nombre, precio, stock, imagen_url }).eq('id', editingId);
  } else {
    result = await supabase.from('productos').insert([{ nombre, precio, stock, imagen_url }]);
  }

  if (result.error) {
    alert('Error guardando producto: ' + result.error.message);
    return;
  }

  productModal.classList.add('hidden');
  await loadProducts();
});

// Editar
async function openEditModal(id) {
  const { data: producto } = await supabase.from('productos').select('*').eq('id', id).single();
  if (!producto) return;

  editingId = id;
  modalTitle.textContent = 'Editar Producto';
  document.querySelector('#product-name').value = producto.nombre;
  document.querySelector('#product-price').value = producto.precio;
  document.querySelector('#product-stock').value = producto.stock;
  document.querySelector('#product-image').value = producto.imagen_url || '';
  productModal.classList.remove('hidden');
}

// Eliminar
async function deleteProduct(id) {
  if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) {
    alert('Error eliminando producto: ' + error.message);
    return;
  }
  await loadProducts();
}

// Cargar inventario al entrar en vista
document.querySelector('[data-view="products-view"]')?.addEventListener('click', () => {
  loadProducts();
});


// Redirigir si cambia el estado de sesión
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    window.location.href = 'login.html';
  }
});

checkAccess();

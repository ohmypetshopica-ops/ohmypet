// frontend/js/tienda.js
import { supabase } from '../supabase-client.js';

const productGrid = document.querySelector('#product-grid');
const noResults = document.querySelector('#no-results');
let allProducts = [];

async function fetchProducts() {
  const { data: productos, error } = await supabase.from('productos').select('*');

  if (error) {
    console.error('Error cargando productos:', error.message);
    noResults.classList.remove('hidden');
    return;
  }

  if (!productos || productos.length === 0) {
    noResults.classList.remove('hidden');
    return;
  }

  allProducts = productos;
  renderProducts(productos);
}

function renderProducts(products) {
  productGrid.innerHTML = '';

  products.forEach((producto) => {
    const card = document.createElement('div');
    card.className = 'bg-white shadow-md rounded-lg p-4';

    card.innerHTML = `
      <img src="${producto.imagen_url ?? 'https://via.placeholder.com/300x300.png?text=Sin+Imagen'}" 
           alt="${producto.nombre}" class="w-full h-48 object-cover rounded-md mb-2">
      <h3 class="text-lg font-semibold">${producto.nombre}</h3>
      <p class="text-gray-700">$${producto.precio}</p>
      <button class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Comprar
      </button>
    `;

    productGrid.appendChild(card);
  });
}

fetchProducts();

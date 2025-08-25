// frontend/js/tienda.js
import { supabase } from '../supabase-client.js';

// --- ELEMENTOS DEL DOM ---
const productGrid = document.querySelector('#product-grid');
const noResults = document.querySelector('#no-results');
const cartSidebar = document.querySelector('#cart-sidebar');
const cartItemsContainer = document.querySelector('#cart-items');
const cartTotalElement = document.querySelector('#cart-total');
const cartItemCountElement = document.querySelector('#cart-item-count');
const openCartBtn = document.querySelector('#cart-bubble-btn');
const closeCartBtn = document.querySelector('#close-cart-btn');
const backdrop = document.querySelector('#backdrop');

// --- ESTADO DEL CARRITO ---
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// --- FUNCIONES ---

/**
 * Muestra los productos en la cuadrícula principal.
 */
function renderProducts(products) {
  productGrid.innerHTML = '';
  if (products.length === 0) {
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');

  products.forEach((producto) => {
    const card = document.createElement('div');
    card.className = 'bg-white shadow-md rounded-lg p-4 flex flex-col';
    card.innerHTML = `
      <img src="${producto.imagen_url || 'https://via.placeholder.com/300x300.png?text=Sin+Imagen'}" 
           alt="${producto.nombre}" class="w-full h-48 object-cover rounded-md mb-2">
      <h3 class="text-lg font-semibold">${producto.nombre}</h3>
      <p class="text-gray-700 text-xl font-bold mt-auto">S/ ${Number(producto.precio).toFixed(2)}</p>
      <button 
        data-id="${producto.id}"
        class="add-to-cart-btn mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
        Comprar
      </button>
    `;
    productGrid.appendChild(card);
  });
}

/**
 * Agrega un producto al carrito.
 */
function addToCart(productId) {
  const productToAdd = allProducts.find(p => p.id === productId);
  if (!productToAdd) return;

  const existingItem = cart.find(item => item.id === productId);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ ...productToAdd, quantity: 1 });
  }

  updateCart();
}

/**
 * Muestra los items dentro del panel del carrito.
 */
function renderCartItems() {
  cartItemsContainer.innerHTML = '';
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-gray-500">Tu carrito está vacío.</p>';
    return;
  }

  cart.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'flex justify-between items-center mb-4';
    itemElement.innerHTML = `
      <div>
        <h4 class="font-semibold">${item.nombre}</h4>
        <p class="text-sm text-gray-600">S/ ${Number(item.precio).toFixed(2)} x ${item.quantity}</p>
      </div>
      <p class="font-bold">S/ ${(item.precio * item.quantity).toFixed(2)}</p>
    `;
    cartItemsContainer.appendChild(itemElement);
  });
}

/**
 * Actualiza toda la UI del carrito y guarda en localStorage.
 */
function updateCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);

  cartItemCountElement.textContent = totalItems;
  cartTotalElement.textContent = `S/ ${totalPrice.toFixed(2)}`;
  
  renderCartItems();
}

/**
 * Muestra u oculta el panel del carrito.
 */
function toggleCart() {
  cartSidebar.classList.toggle('translate-x-full');
  backdrop.classList.toggle('hidden');
}

/**
 * Carga inicial de los productos desde Supabase.
 */
async function fetchProducts() {
  try {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) throw error;
    allProducts = data || [];
    renderProducts(allProducts);
  } catch (error) {
    console.error('Error cargando productos:', error.message);
    noResults.classList.remove('hidden');
  }
}

// --- EVENT LISTENERS ---

// Escuchar clics en los botones "Comprar" usando delegación de eventos.
productGrid.addEventListener('click', (e) => {
  if (e.target.classList.contains('add-to-cart-btn')) {
    const productId = e.target.dataset.id;
    addToCart(productId);
  }
});

// Abrir y cerrar el carrito.
openCartBtn.addEventListener('click', toggleCart);
closeCartBtn.addEventListener('click', toggleCart);
backdrop.addEventListener('click', toggleCart);

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  updateCart();
});
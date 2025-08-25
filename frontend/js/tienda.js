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
const toastContainer = document.querySelector('#toast-container'); // N U E V O

// --- ESTADO DEL CARRITO ---
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// --- N U E V A   F U N C I Ó N ---
/**
 * Muestra una notificación (toast) en la esquina superior derecha.
 */
function showToast(productName) {
    const toast = document.createElement('div');
    toast.className = 'bg-green-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg flex items-center toast-enter';
    toast.innerHTML = `
        <ion-icon name="checkmark-circle-outline" class="text-xl mr-2"></ion-icon>
        <span>'${productName}' fue agregado al carrito.</span>
    `;
    toastContainer.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
        toast.classList.add('toast-enter-active');
    });

    // Desaparecer después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('toast-enter-active');
        toast.classList.add('toast-exit', 'toast-exit-active');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 3000);
}


// --- FUNCIONES ---

/**
 * Muestra los productos en la cuadrícula principal.
 */
/**
 * Muestra los productos en la cuadrícula principal con el nuevo color verde.
 */
/**
 * Muestra los productos en la cuadrícula principal, mostrando los deshabilitados.
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
    const isEnabled = producto.habilitado;

    // Aplica una opacidad si el producto está deshabilitado
    const cardClasses = isEnabled 
        ? 'bg-white shadow-lg rounded-xl p-6 text-center flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-2xl'
        : 'bg-white shadow-lg rounded-xl p-6 text-center flex flex-col opacity-50';
    
    card.className = cardClasses;
    
    // Cambia el botón si el producto está deshabilitado
    const buttonHTML = isEnabled
        ? `<button 
            data-id="${producto.id}"
            class="add-to-cart-btn mt-4 bg-green-500 text-white font-semibold px-6 py-2 rounded-lg hover:bg-green-600 transition-colors w-full">
            Agregar al Carrito
           </button>`
        : `<button 
            disabled
            class="mt-4 bg-gray-400 text-white font-semibold px-6 py-2 rounded-lg cursor-not-allowed w-full">
            No Disponible
           </button>`;

    card.innerHTML = `
      <div class="flex-grow">
        <img src="${producto.imagen_url || 'https://via.placeholder.com/300x300.png?text=Sin+Imagen'}" 
             alt="${producto.nombre}" class="w-full h-48 object-contain rounded-md mb-4">
        <h3 class="text-xl font-bold text-gray-800">${producto.nombre}</h3>
        <p class="text-lg text-green-700 font-semibold my-2">S/ ${Number(producto.precio).toFixed(2)}</p>
      </div>
      ${buttonHTML}
    `;
    productGrid.appendChild(card);
  });
}

/**
 * Agrega un producto al carrito o incrementa su cantidad.
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
  showToast(productToAdd.nombre); // Llamamos a la notificación
}

function increaseQuantity(productId) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity++;
    }
    updateCart();
}

function decreaseQuantity(productId) {
    const item = cart.find(item => item.id === productId);
    if (item && item.quantity > 1) {
        item.quantity--;
    } else if (item && item.quantity === 1) {
        cart = cart.filter(cartItem => cartItem.id !== productId);
    }
    updateCart();
}

function renderCartItems() {
  cartItemsContainer.innerHTML = '';
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-gray-500 text-center">Tu carrito está vacío.</p>';
    return;
  }

  cart.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'flex items-center py-3 border-b';
    itemElement.innerHTML = `
        <img src="${item.imagen_url || 'https://via.placeholder.com/100'}" alt="${item.nombre}" class="w-16 h-16 object-cover rounded-md">
        <div class="flex-grow mx-3">
            <p class="font-semibold text-gray-800">${item.nombre}</p>
            <p class="text-sm text-gray-500">S/ ${Number(item.precio).toFixed(2)}</p>
        </div>
        <div class="flex items-center">
            <button data-id="${item.id}" class="decrease-btn bg-gray-200 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center font-bold hover:bg-gray-300">-</button>
            <span class="w-8 text-center font-semibold">${item.quantity}</span>
            <button data-id="${item.id}" class="increase-btn bg-gray-200 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center font-bold hover:bg-gray-300">+</button>
        </div>
    `;
    cartItemsContainer.appendChild(itemElement);
  });
}

function updateCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);

  cartItemCountElement.textContent = totalItems;
  cartTotalElement.textContent = `S/ ${totalPrice.toFixed(2)}`;
  
  renderCartItems();
}

function toggleCart() {
  cartSidebar.classList.toggle('translate-x-full');
  backdrop.classList.toggle('hidden');
}

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

productGrid.addEventListener('click', (e) => {
  if (e.target.classList.contains('add-to-cart-btn')) {
    const productId = e.target.dataset.id;
    addToCart(productId);
  }
});

cartItemsContainer.addEventListener('click', (e) => {
    const target = e.target;
    const productId = target.dataset.id;
    if (!productId) return;

    if (target.classList.contains('increase-btn')) {
        increaseQuantity(productId);
    }
    if (target.classList.contains('decrease-btn')) {
        decreaseQuantity(productId);
    }
});

openCartBtn.addEventListener('click', toggleCart);
closeCartBtn.addEventListener('click', toggleCart);
backdrop.addEventListener('click', toggleCart);

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  updateCart();
});
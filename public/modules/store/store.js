// public/modules/store/store.js

import { getStoreProducts } from './store.api.js';
import { addProductToCart } from '../../js/cart.js';

// --- ELEMENTOS DEL DOM ---
const productsContainer = document.querySelector('#products-container');

/**
 * Genera el HTML para la tarjeta de un producto.
 */
const createProductCard = (product) => {
    return `
        <div class="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
            <img class="w-full h-48 object-cover" src="${product.image_url || 'https://via.placeholder.com/300x200'}" alt="Imagen de ${product.name}">
            <div class="p-4">
                <h3 class="text-lg font-bold text-gray-800 truncate">${product.name}</h3>
                <p class="text-sm text-gray-600 mt-1 h-10">${product.description || 'Descripción no disponible.'}</p>
                <div class="flex justify-between items-center mt-4">
                    <span class="text-2xl font-extrabold text-green-600">$${product.price}</span>
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">En Stock</span>
                </div>
                <button class="w-full mt-4 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors duration-300">
                    Agregar al Carrito
                </button>
            </div>
        </div>
    `;
};

/**
 * Carga y muestra los productos.
 */
const loadProducts = async () => {
    const products = await getStoreProducts();
    if (products && products.length > 0) {
        productsContainer.innerHTML = products.map(createProductCard).join('');
    } else {
        productsContainer.innerHTML = `<p class="col-span-full text-center py-12 text-gray-500">No hay productos disponibles en este momento.</p>`;
    }
};

/**
 * Configura los event listeners para los botones de agregar.
 */
const setupEventListeners = async () => {
    const products = await getStoreProducts();
    productsContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON' && event.target.textContent.includes('Agregar al Carrito')) {
            const card = event.target.closest('.bg-white');
            const productName = card.querySelector('h3').textContent;
            const productToAdd = products.find(p => p.name === productName);
            if (productToAdd) {
                addProductToCart(productToAdd);
            }
        }
    });
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
});


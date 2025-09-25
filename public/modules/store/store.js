// public/modules/store/store.js

import { getStoreProducts } from './store.api.js';
import { addProductToCart, setupCartEventListeners } from '../../js/cart.js';

// --- ELEMENTOS DEL DOM ---
const productsContainer = document.querySelector('#products-container');

// Clave para guardar los productos en la caché de la sesión
const PRODUCTS_CACHE_KEY = 'ohmypet_products_cache';

const createProductCard = (product) => {
    // (Esta función no cambia)
    return `
        <div class="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
            <img class="w-full h-48 object-cover" src="${product.image_url || 'https://via.placeholder.com/300x200'}" alt="Imagen de ${product.name}" loading="lazy">
            <div class="p-4">
                <h3 class="text-lg font-bold text-gray-800 truncate">${product.name}</h3>
                <p class="text-sm text-gray-600 mt-1 h-10">${product.description || 'Descripción no disponible.'}</p>
                <div class="flex justify-between items-center mt-4">
                    <span class="text-2xl font-extrabold text-green-600">S/${product.price.toFixed(2)}</span>
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">En Stock</span>
                </div>
                <button class="w-full mt-4 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors duration-300 add-to-cart-btn" data-product-id="${product.id}">
                    Agregar al Carrito
                </button>
            </div>
        </div>
    `;
};

/**
 * Carga y muestra los productos, usando caché para optimizar.
 */
const loadProducts = async () => {
    productsContainer.innerHTML = '<p class="col-span-full text-center py-12 text-gray-500">Cargando productos...</p>';

    // 1. Intenta obtener los productos de la caché de la sesión
    const cachedProducts = sessionStorage.getItem(PRODUCTS_CACHE_KEY);

    let products;

    if (cachedProducts) {
        // Si existen en caché, úsalos. ¡Esto es instantáneo!
        products = JSON.parse(cachedProducts);
        console.log("Productos cargados desde la caché.");
    } else {
        // Si no, ve a la base de datos
        products = await getStoreProducts();
        // y guárdalos en caché para la próxima vez
        sessionStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
        console.log("Productos cargados desde la API y guardados en caché.");
    }
    
    // 2. Renderiza los productos
    if (products && products.length > 0) {
        productsContainer.innerHTML = products.map(createProductCard).join('');
    } else {
        productsContainer.innerHTML = `<p class="col-span-full text-center py-12 text-gray-500">No hay productos disponibles en este momento.</p>`;
    }
};


const setupProductAddListeners = async () => {
    // La lógica de añadir al carrito ahora depende de tener los productos ya cargados.
    // Usaremos delegación de eventos para que funcione siempre.
    productsContainer.addEventListener('click', async (event) => {
        if (!event.target.classList.contains('add-to-cart-btn')) return;
        
        const productId = event.target.dataset.productId;
        const products = JSON.parse(sessionStorage.getItem(PRODUCTS_CACHE_KEY));
        
        if (!products) {
            console.error("No se encontraron productos en caché para añadir al carrito.");
            return;
        }

        const productToAdd = products.find(p => p.id == productId);
        if (productToAdd) {
            addProductToCart(productToAdd);
        }
    });
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupProductAddListeners();
    setupCartEventListeners(); 
});
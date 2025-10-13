// public/modules/store/store.js

import { getStoreProducts } from './store.api.js';
import { addProductToCart, setupCartEventListeners } from '../../js/cart.js';

// --- ELEMENTOS DEL DOM ---
const productsContainer = document.querySelector('#products-container');
const productCount = document.querySelector('#product-count');
const categoryButtons = document.querySelectorAll('.category-btn');
const sortSelect = document.querySelector('#sort-select');

// Clave para guardar los productos en la caché de la sesión
const PRODUCTS_CACHE_KEY = 'ohmypet_products_cache';

let allProducts = [];
let currentCategory = 'all';
let currentSort = 'default';

const createProductCard = (product) => {
    return `
        <div class="product-card bg-white rounded-2xl shadow-md overflow-hidden">
            <div class="product-image-container h-56 relative">
                <img class="product-image w-full h-full object-cover" 
                     src="${product.image_url || 'https://via.placeholder.com/400x300/10b981/ffffff?text=' + encodeURIComponent(product.name)}" 
                     alt="${product.name}" 
                     loading="lazy">
                ${product.is_new ? '<span class="badge-new absolute top-3 right-3 px-3 py-1 text-xs font-bold text-white rounded-full">NUEVO</span>' : ''}
                ${product.discount ? '<span class="badge-sale absolute top-3 left-3 px-3 py-1 text-xs font-bold text-white rounded-full">-' + product.discount + '%</span>' : ''}
            </div>
            <div class="p-5">
                <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">${product.name}</h3>
                <p class="text-sm text-gray-600 mb-4 line-clamp-2">${product.description || 'Producto de alta calidad para tu mascota.'}</p>
                
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <span class="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">S/${product.price.toFixed(2)}</span>
                        ${product.old_price ? '<span class="text-sm text-gray-400 line-through ml-2">S/' + product.old_price.toFixed(2) + '</span>' : ''}
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                        ${product.stock > 10 ? 'En Stock' : 'Últimas ' + product.stock + ' unidades'}
                    </span>
                </div>
                
                <button class="add-to-cart-btn w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2" 
                        data-product-id="${product.id}">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
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
    productsContainer.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center py-20"><div class="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div><p class="text-gray-500">Cargando productos...</p></div>';

    // 1. Intenta obtener los productos de la caché de la sesión
    const cachedProducts = sessionStorage.getItem(PRODUCTS_CACHE_KEY);

    if (cachedProducts) {
        allProducts = JSON.parse(cachedProducts);
        console.log("Productos cargados desde la caché.");
    } else {
        allProducts = await getStoreProducts();
        sessionStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(allProducts));
        console.log("Productos cargados desde la API y guardados en caché.");
    }
    
    renderProducts();
};

/**
 * Filtra y ordena los productos según los criterios actuales
 */
const getFilteredAndSortedProducts = () => {
    let filtered = allProducts;
    
    // Filtrar por categoría
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category?.toLowerCase() === currentCategory);
    }
    
    // Ordenar
    switch (currentSort) {
        case 'price-asc':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        default:
            // Orden por defecto (como viene de la BD)
            break;
    }
    
    return filtered;
};

/**
 * Renderiza los productos filtrados
 */
const renderProducts = () => {
    const products = getFilteredAndSortedProducts();
    
    if (products && products.length > 0) {
        productsContainer.innerHTML = products.map(createProductCard).join('');
        productCount.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''} ${currentCategory !== 'all' ? 'en esta categoría' : 'disponibles'}`;
    } else {
        productsContainer.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20">
                <svg class="h-24 w-24 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="text-xl text-gray-500 mb-2">No hay productos disponibles</p>
                <p class="text-sm text-gray-400">Intenta con otra categoría</p>
            </div>
        `;
        productCount.textContent = 'No se encontraron productos';
    }
};

/**
 * Configura los listeners para agregar productos al carrito
 */
const setupProductAddListeners = () => {
    productsContainer.addEventListener('click', (event) => {
        if (!event.target.closest('.add-to-cart-btn')) return;
        
        const button = event.target.closest('.add-to-cart-btn');
        const productId = button.dataset.productId;
        
        const productToAdd = allProducts.find(p => p.id == productId);
        if (productToAdd) {
            addProductToCart(productToAdd);
        }
    });
};

/**
 * Configura los filtros de categoría
 */
const setupCategoryFilters = () => {
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Actualizar botón activo
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Cambiar categoría
            currentCategory = btn.dataset.category;
            renderProducts();
        });
    });
};

/**
 * Configura el selector de ordenamiento
 */
const setupSorting = () => {
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProducts();
    });
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupProductAddListeners();
    setupCategoryFilters();
    setupSorting();
    setupCartEventListeners(); 
});
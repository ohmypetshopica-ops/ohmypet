// public/modules/store/store.js

import { getStoreProducts } from './store.api.js';
import { addProductToCart, setupCartEventListeners } from '../../js/cart.js';

const productsContainer = document.querySelector('#products-container');
const showingCount = document.querySelector('#showing-count');
const totalCount = document.querySelector('#total-count');
const categoryButtons = document.querySelectorAll('.category-filter-btn');
const sortSelect = document.querySelector('#sort-select');
const priceRange = document.querySelector('#price-range');
const maxPriceDisplay = document.querySelector('#max-price-display');
const viewButtons = document.querySelectorAll('.view-btn');

let allProducts = [];
let currentCategory = 'all';
let currentSort = 'default';
let maxPrice = 200;
let currentCols = 4;

const createProductCard = (product) => {
    const optimizedImageUrl = product.image_url 
        ? `${product.image_url}?width=400&quality=75` 
        : `https://via.placeholder.com/300x300/10b981/ffffff?text=${encodeURIComponent(product.name)}`;

    return `
        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div class="relative bg-gray-100 h-48">
                <img class="w-full h-full object-cover" 
                     src="${optimizedImageUrl}" 
                     alt="${product.name}">
                ${product.discount ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">-${product.discount}%</span>` : ''}
                ${product.is_new ? '<span class="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">NUEVO</span>' : ''}
                <button class="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100 transition wishlist-btn">
                    <svg class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
            </div>
            <div class="p-4">
                <h3 class="text-sm font-semibold text-gray-800 mb-2 line-clamp-2 h-10">${product.name}</h3>
                <div class="flex items-center justify-between mb-3">
                    <div>
                        ${product.old_price ? `<span class="text-xs text-gray-400 line-through">S/ ${product.old_price.toFixed(2)}</span>` : ''}
                        <p class="text-lg font-bold text-gray-900">S/ ${product.price.toFixed(2)}</p>
                    </div>
                    ${product.stock > 0 ? `<span class="text-xs text-green-600 font-medium">${product.stock > 10 ? 'En Stock' : 'Quedan ' + product.stock}</span>` : '<span class="text-xs text-red-600 font-medium">Agotado</span>'}
                </div>
                <button class="add-to-cart-btn w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2" 
                        data-product-id="${product.id}"
                        ${product.stock === 0 ? 'disabled' : ''}>
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Agregar al Carrito</span>
                </button>
            </div>
        </div>
    `;
};

// --- FUNCIÓN CORREGIDA ---
const loadProducts = async () => {
    productsContainer.innerHTML = '<div class="col-span-full flex justify-center py-20"><div class="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div></div>';

    // Se eliminó la caché de 'sessionStorage' para garantizar que siempre se obtengan los productos más recientes de la base de datos.
    allProducts = await getStoreProducts();
    
    // Una nota importante: la función getStoreProducts solo trae productos con stock > 0.
    // Asegúrate de que tus nuevos productos tengan al menos 1 en stock para que aparezcan.
    
    renderProducts();
};

const getFilteredAndSortedProducts = () => {
    let filtered = allProducts;
    
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category?.toLowerCase() === currentCategory);
    }
    
    filtered = filtered.filter(p => p.price <= maxPrice);
    
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
    }
    
    return filtered;
};

const updateGridColumns = () => {
    productsContainer.className = `grid gap-4 grid-cols-1`;
    if (currentCols === 3) {
        productsContainer.className += ` sm:grid-cols-2 lg:grid-cols-3`;
    } else if (currentCols === 4) {
        productsContainer.className += ` sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    }
};

const renderProducts = () => {
    const products = getFilteredAndSortedProducts();
    
    if (totalCount) totalCount.textContent = products.length;
    if (showingCount) showingCount.textContent = products.length;
    
    if (products && products.length > 0) {
        updateGridColumns();
        productsContainer.innerHTML = products.map(createProductCard).join('');
    } else {
        productsContainer.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20">
                <svg class="h-24 w-24 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="text-lg text-gray-500">No se encontraron productos con estos filtros.</p>
            </div>
        `;
    }
};

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

const setupCategoryFilters = () => {
    // Establecer el botón "Todos los productos" como activo al inicio
    const allButton = document.querySelector('.category-filter-btn[data-category="all"]');
    if (allButton) {
        allButton.classList.add('active');
    }
    
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentCategory = btn.dataset.category;
            renderProducts();
        });
    });
};

const setupPriceFilter = () => {
    if (!priceRange) return;

    let debounceTimer;
    priceRange.addEventListener('input', (e) => {
        if (maxPriceDisplay) {
            maxPriceDisplay.textContent = e.target.value;
        }
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            maxPrice = parseInt(e.target.value);
            renderProducts();
        }, 250);
    });
};

const setupSorting = () => {
    if (!sortSelect) return;
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProducts();
    });
};

const setupViewToggle = () => {
    // Establecer el botón de 4 columnas como activo al inicio
    const defaultViewBtn = document.querySelector('.view-btn[data-cols="4"]');
    if (defaultViewBtn) {
        defaultViewBtn.classList.add('active');
    }

    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentCols = parseInt(btn.dataset.cols);
            renderProducts();
        });
    });
};

document.addEventListener('storeReady', () => {
    loadProducts();
    setupProductAddListeners();
    setupCategoryFilters();
    setupPriceFilter();
    setupSorting();
    setupViewToggle();
    setupCartEventListeners();
});
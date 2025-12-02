// public/modules/dashboard/dashboard-pos.js

import { supabase } from '../../core/supabase.js';

// 1. Importar productos (inventario)
import { getPOSProductsPaginated, updateProduct } from './products.api.js';

// 2. Importar ventas (registrar venta) - ¡AQUÍ ESTABA EL ERROR!
import { addSale } from './sales.api.js';

// 3. Importar clientes (buscar cliente para la venta)
import { getClients } from './clients.api.js';

console.log('✅ dashboard-pos.js cargado (Versión Modular)');

// --- ELEMENTOS DEL DOM ---
const productsGrid = document.getElementById('products-grid');
const productSearch = document.getElementById('product-search');
const cartItems = document.getElementById('cart-items');
const subtotalElement = document.getElementById('subtotal');
const taxElement = document.getElementById('tax');
const totalElement = document.getElementById('total');
const clearCartBtn = document.getElementById('clear-cart-btn');
const processSaleBtn = document.getElementById('process-sale-btn');
const ticketNumberElement = document.getElementById('ticket-number');

// Modal y Elementos de Pago
const paymentModal = document.getElementById('payment-modal');
const paymentMethodSelect = document.getElementById('payment-method');
const cashReceivedInput = document.getElementById('cash-received');
const changeDisplay = document.getElementById('change-display');
const changeAmountElement = document.getElementById('change-amount');
const customerSearch = document.getElementById('customer-search');
const customerResults = document.getElementById('customer-results');
const selectedCustomerIdInput = document.getElementById('selected-customer-id');
const selectedCustomerDisplay = document.getElementById('selected-customer-display');
const selectedCustomerName = document.getElementById('selected-customer-name');
const clearCustomerBtn = document.getElementById('clear-customer-btn');
const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
const modalTotalElement = document.getElementById('modal-total');
const cashSection = document.getElementById('cash-section');
const saleDateInput = document.getElementById('sale-date');

// Elementos de la Alerta (Toast)
const customToast = document.getElementById('custom-toast');
const toastMessage = document.getElementById('toast-message');

// --- VARIABLES GLOBALES ---
let cart = [];
let allClients = [];
let ticketNumber = 1;

// --- VARIABLES PARA LAZY LOADING ---
let posCurrentPage = 1;
const posItemsPerPage = 20; 
let posIsLoading = false;
let posHasMore = true;
let currentSearchTerm = '';
let loadedProductsCache = []; 

// Elemento centinela para scroll infinito
const sentinel = document.createElement('div');
sentinel.id = 'infinite-scroll-sentinel';
sentinel.className = 'col-span-full h-10 flex justify-center items-center py-4';
sentinel.innerHTML = '<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 hidden"></div>';

// --- FUNCIÓN DE ALERTA ---
const showBounceToast = (message) => {
    if (!customToast || !toastMessage) return;
    toastMessage.textContent = message;
    customToast.classList.remove('hidden');
    setTimeout(() => {
        customToast.classList.remove('translate-y-[-100%]', 'opacity-0');
        customToast.classList.add('translate-y-4', 'opacity-100');
        setTimeout(() => {
            customToast.classList.remove('translate-y-4');
            customToast.classList.add('translate-y-0');
        }, 300);
    }, 10);
    setTimeout(() => {
        customToast.classList.remove('translate-y-0', 'opacity-100');
        customToast.classList.add('translate-y-[-100%]', 'opacity-0');
        setTimeout(() => {
            customToast.classList.add('hidden');
        }, 300);
    }, 3000);
};

// --- RENDERIZADO DE PRODUCTOS ---
const renderProducts = (products, append = false) => {
    if (!append) {
        productsGrid.innerHTML = '';
        loadedProductsCache = [];
        productsGrid.appendChild(sentinel);
    }

    products.forEach(p => {
        if (!loadedProductsCache.find(existing => existing.id === p.id)) {
            loadedProductsCache.push(p);
        }
    });

    if (products.length === 0 && !append) {
        productsGrid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400"><p>No se encontraron productos</p></div>';
        return;
    }

    const productsHTML = products.map(product => {
        const imageUrl = product.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=D1D5DB&color=FFFFFF`;
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-shadow cursor-pointer transform transition-transform hover:scale-105 product-card-anim" data-product-id="${product.id}">
                <img src="${imageUrl}" alt="${product.name}" class="w-full h-24 object-cover rounded-md mb-2 bg-gray-100">
                <h3 class="font-semibold text-sm text-gray-800 truncate" title="${product.name}">${product.name}</h3>
                <div class="flex justify-between items-end mt-2">
                    <p class="text-xs text-gray-500 mb-1">Stock: <span class="font-bold">${product.stock}</span></p>
                    <p class="text-lg font-bold text-green-600">S/ ${product.price.toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');

    sentinel.insertAdjacentHTML('beforebegin', productsHTML);

    const newCards = productsGrid.querySelectorAll(`[data-product-id]`);
    newCards.forEach(card => {
        card.replaceWith(card.cloneNode(true));
    });
    
    productsGrid.querySelectorAll(`[data-product-id]`).forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            const product = loadedProductsCache.find(p => p.id === productId);
            if (product) addToCart(product);
        });
    });
};

// --- CARGA DE PRODUCTOS ---
const loadMoreProducts = async () => {
    if (posIsLoading || !posHasMore) return;

    posIsLoading = true;
    sentinel.querySelector('div').classList.remove('hidden');

    try {
        const { data, count } = await getPOSProductsPaginated(posCurrentPage, posItemsPerPage, currentSearchTerm);
        
        if (data.length < posItemsPerPage) {
            posHasMore = false;
        }

        renderProducts(data, true);
        posCurrentPage++;

    } catch (error) {
        console.error("Error cargando productos:", error);
    } finally {
        posIsLoading = false;
        sentinel.querySelector('div').classList.add('hidden');
        if (!posHasMore) sentinel.classList.add('hidden');
        else sentinel.classList.remove('hidden');
    }
};

const setupInfiniteScroll = () => {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMoreProducts();
        }
    }, {
        root: productsGrid.parentElement,
        rootMargin: '100px',
        threshold: 0.1
    });
    observer.observe(sentinel);
};

// --- MANEJO DE BÚSQUEDA ---
let searchTimeout;
productSearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const term = e.target.value.trim();
    
    searchTimeout = setTimeout(async () => {
        currentSearchTerm = term;
        posCurrentPage = 1;
        posHasMore = true;
        productsGrid.innerHTML = '';
        productsGrid.appendChild(sentinel);
        await loadMoreProducts();
    }, 300);
});

// --- LÓGICA DEL CARRITO ---
const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert(`Stock máximo alcanzado (${product.stock} unidades)`);
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price, 
            quantity: 1,
            stock: product.stock,
            note: '' 
        });
    }
    renderCart();
    updateTotals();
};

const removeFromCart = (productId) => {
    cart = cart.filter(item => item.id !== productId);
    renderCart();
    updateTotals();
};

const updateQuantity = (productId, newQuantity) => {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > item.stock) {
        alert(`Stock máximo: ${item.stock} unidades`);
        renderCart(); 
        return;
    }
    
    item.quantity = newQuantity;
    renderCart();
    updateTotals();
};

const updateCartItemPrice = (productId, newPrice) => {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.price = newPrice;
        renderCart(); 
        updateTotals(); 
    }
};

const renderCart = () => {
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <svg class="h-16 w-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p>Carrito vacío</p>
            </div>
        `;
        processSaleBtn.disabled = true;
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <h4 class="font-semibold text-sm text-gray-800">${item.name}</h4>
                    <div class="cart-item-price-container" data-product-id="${item.id}">
                        <p class="price-display text-xs text-gray-500 cursor-pointer py-1" title="Clic para editar precio">
                            S/ ${item.price.toFixed(2)} c/u
                        </p>
                        <div class="price-edit hidden flex items-center py-0.5">
                            <span class="text-xs text-gray-500 mr-1">S/</span>
                            <input type="number" step="0.10" class="cart-item-price-input w-20 border border-gray-300 rounded px-1 py-0.5 text-xs" value="${item.price.toFixed(2)}">
                        </div>
                    </div>
                    <div class="mt-1">
                        <input type="text" 
                               class="cart-item-note-input w-full p-1.5 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-green-500 focus:border-green-500 placeholder-gray-400" 
                               placeholder="Agregar descripción/nota (opcional)..."
                               value="${item.note || ''}" 
                               data-product-id="${item.id}">
                    </div>
                </div>
                <button class="text-red-500 hover:text-red-700 ml-2" data-remove="${item.id}">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="flex items-center justify-between mt-2">
                <div class="flex items-center gap-2">
                    <button class="bg-gray-200 hover:bg-gray-300 w-7 h-7 rounded flex items-center justify-center" data-decrease="${item.id}">-</button>
                    <span class="font-bold text-gray-800 w-8 text-center">${item.quantity}</span>
                    <button class="bg-gray-200 hover:bg-gray-300 w-7 h-7 rounded flex items-center justify-center" data-increase="${item.id}">+</button>
                </div>
                <span class="font-bold text-green-600">S/ ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        </div>
    `).join('');
        
    processSaleBtn.disabled = false;
};

const setupCartEventListeners = () => {
    if (!cartItems) return;

    cartItems.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove]');
        const decreaseBtn = e.target.closest('[data-decrease]');
        const increaseBtn = e.target.closest('[data-increase]');
        const priceDisplay = e.target.closest('.price-display');

        if (removeBtn) { removeFromCart(removeBtn.dataset.remove); return; }
        if (decreaseBtn) {
            const item = cart.find(i => i.id === decreaseBtn.dataset.decrease);
            if (item) updateQuantity(item.id, item.quantity - 1);
            return;
        }
        if (increaseBtn) {
            const item = cart.find(i => i.id === increaseBtn.dataset.increase);
            if (item) updateQuantity(item.id, item.quantity + 1);
            return;
        }
        if (priceDisplay) {
            const container = priceDisplay.closest('.cart-item-price-container');
            if (!container) return;
            const editView = container.querySelector('.price-edit');
            const input = container.querySelector('.cart-item-price-input');
            priceDisplay.classList.add('hidden');
            editView.classList.remove('hidden');
            input.focus();
            input.select();
        }
    });

    cartItems.addEventListener('change', (e) => {
        if (e.target.classList.contains('cart-item-price-input')) {
            const newPrice = parseFloat(e.target.value);
            const productId = e.target.closest('.cart-item-price-container').dataset.productId;
            if (!isNaN(newPrice) && newPrice >= 0) { updateCartItemPrice(productId, newPrice); } 
            else { renderCart(); }
        }
    });

    cartItems.addEventListener('blur', (e) => {
        if (e.target.classList.contains('cart-item-price-input')) {
            const newPrice = parseFloat(e.target.value);
            const productId = e.target.closest('.cart-item-price-container').dataset.productId;
            if (!isNaN(newPrice) && newPrice >= 0) { updateCartItemPrice(productId, newPrice); }
            else { renderCart(); }
        }
    }, true);

    cartItems.addEventListener('input', (e) => {
        if (e.target.classList.contains('cart-item-note-input')) {
            const newNote = e.target.value;
            const productId = e.target.dataset.productId;
            const item = cart.find(i => i.id === productId);
            if (item) { item.note = newNote; }
        }
    });
};

const updateTotals = () => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotal = total / 1.18;
    const tax = total - subtotal;
    
    subtotalElement.textContent = subtotal.toFixed(2);
    taxElement.textContent = tax.toFixed(2);
    totalElement.textContent = total.toFixed(2);
    modalTotalElement.textContent = total.toFixed(2);
};

const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('¿Estás seguro de limpiar el carrito?')) {
        cart = [];
        renderCart();
        updateTotals();
    }
};

// --- MODAL DE PAGO ---
const openPaymentModal = () => {
    paymentModal.classList.remove('hidden');
    cashReceivedInput.value = '';
    changeDisplay.classList.add('hidden');
    customerSearch.value = '';
    customerResults.classList.add('hidden');
    selectedCustomerIdInput.value = '';
    selectedCustomerDisplay.classList.add('hidden');
    paymentMethodSelect.value = 'EFECTIVO'; 
    saleDateInput.value = new Date().toISOString().split('T')[0];
    updatePaymentButton();
};

const closePaymentModal = () => {
    paymentModal.classList.add('hidden');
};

const updatePaymentButton = () => {
    const total = parseFloat(modalTotalElement.textContent);
    const customerId = selectedCustomerIdInput.value;
    const saleDate = saleDateInput.value;
    
    if (!customerId || !saleDate) {
        confirmPaymentBtn.disabled = true;
        return;
    }
    
    if (paymentMethodSelect.value === 'EFECTIVO') {
        const cashReceived = parseFloat(cashReceivedInput.value) || 0;
        confirmPaymentBtn.disabled = cashReceived < total;
    } else {
        confirmPaymentBtn.disabled = false;
    }
};

// --- BÚSQUEDA DE CLIENTES ---
const handleSearchClients = (searchTerm) => {
    if (searchTerm.length < 2) {
        customerResults.classList.add('hidden');
        return;
    }
    
    const filtered = allClients.filter(client => {
        const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
    });
    
    if (filtered.length === 0) {
        customerResults.innerHTML = '<div class="p-3 text-sm text-gray-500">No se encontraron clientes</div>';
        customerResults.classList.remove('hidden');
        return;
    }
    
    customerResults.innerHTML = filtered.map(client => {
        const displayName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.full_name;
        return `
            <div class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0" data-client-id="${client.id}" data-client-name="${displayName}">
                <p class="font-medium text-sm">${displayName}</p>
                <p class="text-xs text-gray-500">${client.phone || 'Sin teléfono'}</p>
            </div>
        `;
    }).join('');
    
    customerResults.classList.remove('hidden');
    
    customerResults.querySelectorAll('[data-client-id]').forEach(item => {
        item.addEventListener('click', () => {
            selectedCustomerIdInput.value = item.dataset.clientId;
            selectedCustomerName.textContent = item.dataset.clientName;
            selectedCustomerDisplay.classList.remove('hidden');
            customerSearch.value = '';
            customerResults.classList.add('hidden');
            updatePaymentButton();
        });
    });
};

// --- PROCESAMIENTO DE VENTA ---
const processSale = async () => {
    const customerId = selectedCustomerIdInput.value;
    const saleDate = saleDateInput.value;

    if (!customerId || !saleDate) {
        alert('Debe seleccionar un cliente y una fecha');
        return;
    }
    
    confirmPaymentBtn.disabled = true;
    confirmPaymentBtn.textContent = 'Procesando...';
    
    const saleData = {
        client_id: customerId,
        payment_method: paymentMethodSelect.value, 
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price, 
            subtotal: item.price * item.quantity,
            note: item.note || ''
        }))
    };
    
    const { success, error } = await addSale(saleData, saleDate); 
    
    if (!success) {
        console.error('Error:', error);
        alert('Error al procesar la venta: ' + (error.message || 'Error desconocido'));
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.textContent = 'Confirmar Venta';
        return;
    }
    
    // Actualizar stock visualmente
    for (const item of cart) {
        const product = loadedProductsCache.find(p => p.id === item.id);
        if (product) {
            product.stock -= item.quantity;
            const card = productsGrid.querySelector(`[data-product-id="${item.id}"]`);
            if (card) {
                card.querySelector('p.text-gray-500 span').textContent = product.stock;
            }
        }
    }
    
    showBounceToast('¡Venta procesada con éxito!');
    
    cart = [];
    renderCart();
    updateTotals();
    closePaymentModal();
    
    ticketNumber++;
    ticketNumberElement.textContent = String(ticketNumber).padStart(4, '0');
    
    confirmPaymentBtn.disabled = false;
    confirmPaymentBtn.textContent = 'Confirmar Venta';
};

// --- LISTENERS ---
clearCartBtn.addEventListener('click', clearCart);
processSaleBtn.addEventListener('click', openPaymentModal);
cancelPaymentBtn.addEventListener('click', closePaymentModal);
confirmPaymentBtn.addEventListener('click', processSale);
saleDateInput.addEventListener('change', updatePaymentButton);

paymentMethodSelect.addEventListener('change', (e) => {
    if (e.target.value === 'EFECTIVO') {
        cashSection.classList.remove('hidden');
    } else {
        cashSection.classList.add('hidden');
        changeDisplay.classList.add('hidden');
    }
    updatePaymentButton();
});

cashReceivedInput.addEventListener('input', () => {
    const total = parseFloat(modalTotalElement.textContent);
    const cashReceived = parseFloat(cashReceivedInput.value) || 0;
    if (cashReceived >= total) {
        changeAmountElement.textContent = (cashReceived - total).toFixed(2);
        changeDisplay.classList.remove('hidden');
    } else {
        changeDisplay.classList.add('hidden');
    }
    updatePaymentButton();
});

customerSearch.addEventListener('input', (e) => {
    handleSearchClients(e.target.value);
});

clearCustomerBtn.addEventListener('click', () => {
    selectedCustomerIdInput.value = '';
    selectedCustomerDisplay.classList.add('hidden');
    updatePaymentButton();
});

// --- INICIALIZACIÓN ---
const initializePOS = async () => {
    if (!productsGrid || !cartItems) return;
    
    productsGrid.appendChild(sentinel);
    setupInfiniteScroll();
    
    // Cargar clientes para el POS
    allClients = await getClients();
    
    await loadMoreProducts();
    
    renderCart();
    updateTotals();
    setupCartEventListeners();
    
    ticketNumberElement.textContent = String(ticketNumber).padStart(4, '0');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePOS);
} else {
    initializePOS();
}
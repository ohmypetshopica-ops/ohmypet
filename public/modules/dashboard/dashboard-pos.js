// public/modules/dashboard/dashboard-pos.js

import { supabase } from '../../core/supabase.js';
import { getProducts, addSale } from './dashboard.api.js'; // addSale importado correctamente

console.log('✅ dashboard-pos.js cargado');

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

// Modal
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

// --- VARIABLES GLOBALES ---
let allProducts = [];
let cart = [];
let allClients = [];
let ticketNumber = 1;

// --- FUNCIONES DE API ---
const getClients = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, phone')
        .eq('role', 'cliente')
        .order('first_name', { ascending: true });
    
    if (error) {
        console.error('Error al obtener clientes:', error);
        return [];
    }
    return data || [];
};

// addSale se importa desde dashboard.api.js

const updateProductStock = async (productId, newStock) => {
    const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);
    
    if (error) {
        console.error('Error al actualizar stock:', error);
        return { success: false, error };
    }
    return { success: true };
};

// --- RENDERIZADO DE PRODUCTOS ---
const renderProducts = (products) => {
    if (products.length === 0) {
        productsGrid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400"><p>No hay productos disponibles</p></div>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => {
        const imageUrl = product.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=D1D5DB&color=FFFFFF`;
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-shadow cursor-pointer" data-product-id="${product.id}">
                <img src="${imageUrl}" alt="${product.name}" class="w-full h-24 object-cover rounded-md mb-2">
                <h3 class="font-semibold text-sm text-gray-800 truncate">${product.name}</h3>
                <p class="text-xs text-gray-500 mb-1">Stock: ${product.stock}</p>
                <p class="text-lg font-bold text-green-600">S/ ${product.price.toFixed(2)}</p>
            </div>
        `;
    }).join('');
    
    productsGrid.querySelectorAll('[data-product-id]').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            const product = allProducts.find(p => p.id === productId);
            if (product) addToCart(product);
        });
    });
};

// --- FUNCIONES DEL CARRITO ---
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
            price: product.price, // El precio se puede modificar después en el carrito
            quantity: 1,
            stock: product.stock
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

/**
 * Actualiza el precio de un ítem en el carrito.
 */
const updateCartItemPrice = (productId, newPrice) => {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.price = newPrice;
        renderCart(); // Re-renderiza el carrito (para actualizar el subtotal del ítem)
        updateTotals(); // Re-renderiza los totales globales
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
        <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
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

                </div>
                <button class="text-red-500 hover:text-red-700" data-remove="${item.id}">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <button class="bg-gray-200 hover:bg-gray-300 w-7 h-7 rounded flex items-center justify-center" data-decrease="${item.id}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                        </svg>
                    </button>
                    <span class="font-bold text-gray-800 w-8 text-center">${item.quantity}</span>
                    <button class="bg-gray-200 hover:bg-gray-300 w-7 h-7 rounded flex items-center justify-center" data-increase="${item.id}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
                <span class="font-bold text-green-600">S/ ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        </div>
    `).join('');
        
    processSaleBtn.disabled = false;
};


// --- INICIO DE LA CORRECCIÓN (Listeners movidos a una función única) ---

/**
 * Configura todos los event listeners para los botones dentro del carrito.
 * Se debe llamar UNA SOLA VEZ en initializePOS.
 */
const setupCartEventListeners = () => {
    if (!cartItems) return;

    // Delegación de eventos para CLICS
    cartItems.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove]');
        const decreaseBtn = e.target.closest('[data-decrease]');
        const increaseBtn = e.target.closest('[data-increase]');
        const priceDisplay = e.target.closest('.price-display');

        if (removeBtn) {
            removeFromCart(removeBtn.dataset.remove);
            return;
        }

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

    // Delegación de eventos para CHANGE (Enter en el input de precio)
    cartItems.addEventListener('change', (e) => {
        if (e.target.classList.contains('cart-item-price-input')) {
            const newPrice = parseFloat(e.target.value);
            const productId = e.target.closest('.cart-item-price-container').dataset.productId;
            
            if (!isNaN(newPrice) && newPrice >= 0) {
                updateCartItemPrice(productId, newPrice); // Esto re-renderizará
            } else {
                renderCart(); // Valor inválido, resetea
            }
        }
    });

    // Delegación de eventos para BLUR (clic fuera del input de precio)
    cartItems.addEventListener('blur', (e) => {
        if (e.target.classList.contains('cart-item-price-input')) {
            const newPrice = parseFloat(e.target.value);
            const productId = e.target.closest('.cart-item-price-container').dataset.productId;

            if (!isNaN(newPrice) && newPrice >= 0) {
                updateCartItemPrice(productId, newPrice);
            } else {
                renderCart(); // Valor inválido, resetea
            }
        }
    }, true); // Usar fase de captura para el evento blur
};
// --- FIN DE LA CORRECCIÓN ---


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
    paymentMethodSelect.value = 'EFECTIVO'; // Default to first ENUM value
    
    saleDateInput.value = new Date().toISOString().split('T')[0];

    updatePaymentButton();
};

const closePaymentModal = () => {
    paymentModal.classList.add('hidden');
};

const updatePaymentButton = () => {
    const paymentMethod = paymentMethodSelect.value;
    const total = parseFloat(modalTotalElement.textContent);
    const customerId = selectedCustomerIdInput.value;
    const saleDate = saleDateInput.value;
    
    if (!customerId || !saleDate) {
        confirmPaymentBtn.disabled = true;
        return;
    }
    
    if (paymentMethod === 'EFECTIVO') {
        const cashReceived = parseFloat(cashReceivedInput.value) || 0;
        confirmPaymentBtn.disabled = cashReceived < total;
    } else {
        confirmPaymentBtn.disabled = false;
    }
};

// --- BÚSQUEDA DE CLIENTES ---
const searchClients = (searchTerm) => {
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
        alert('Debe seleccionar un cliente y una fecha para la venta');
        return;
    }
    
    confirmPaymentBtn.disabled = true;
    confirmPaymentBtn.textContent = 'Procesando...';
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const paymentMethod = paymentMethodSelect.value;
    
    const saleData = {
        client_id: customerId,
        payment_method: paymentMethod, // Se envía en MAYÚSCULAS
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price, // <- Se usa el precio del carrito (potencialmente modificado)
            subtotal: item.price * item.quantity // <- Se usa el precio del carrito (potencialmente modificado)
        }))
    };
    
    const { success, error } = await addSale(saleData, saleDate); 
    
    if (!success) {
        console.error('Error completo:', error);
        alert('Error al procesar la venta: ' + (error.message || 'Error desconocido'));
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.textContent = 'Confirmar Venta';
        return;
    }
    
    // Actualizar stock de productos
    for (const item of cart) {
        const product = allProducts.find(p => p.id === item.id);
        if (product) {
            const newStock = product.stock - item.quantity;
            await updateProductStock(item.id, newStock);
            product.stock = newStock;
        }
    }
    
    alert('¡Venta procesada con éxito!');
    
    cart = [];
    renderCart();
    updateTotals();
    closePaymentModal();
    
    renderProducts(allProducts.filter(p => p.stock > 0));
    
    ticketNumber++;
    ticketNumberElement.textContent = String(ticketNumber).padStart(4, '0');
    
    confirmPaymentBtn.disabled = false;
    confirmPaymentBtn.textContent = 'Confirmar Venta';
};

// --- EVENT LISTENERS ---
productSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) && product.stock > 0
    );
    renderProducts(filtered);
});

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
        const change = cashReceived - total;
        changeAmountElement.textContent = change.toFixed(2);
        changeDisplay.classList.remove('hidden');
    } else {
        changeDisplay.classList.add('hidden');
    }
    
    updatePaymentButton();
});

customerSearch.addEventListener('input', (e) => {
    searchClients(e.target.value);
});

clearCustomerBtn.addEventListener('click', () => {
    selectedCustomerIdInput.value = '';
    selectedCustomerDisplay.classList.add('hidden');
    updatePaymentButton();
});

// --- INICIALIZACIÓN ---
const initializePOS = async () => {
    console.log('🚀 Inicializando POS...');
    
    if (!productsGrid) {
        console.error('❌ productsGrid no encontrado');
        return;
    }
    
    if (!cartItems) {
        console.error('❌ cartItems no encontrado');
        return;
    }
    
    try {
        console.log('📦 Obteniendo productos...');
        allProducts = await getProducts();
        console.log('✅ Productos cargados:', allProducts.length);
        
        console.log('👥 Obteniendo clientes...');
        allClients = await getClients();
        console.log('✅ Clientes cargados:', allClients.length);
        
        console.log('🎨 Renderizando productos...');
        renderProducts(allProducts.filter(p => p.stock > 0));
        
        console.log('🛒 Renderizando carrito...');
        renderCart();
        updateTotals();
        
        // --- INICIO DE LA CORRECCIÓN (Mover la llamada aquí) ---
        // Configura los listeners del carrito UNA SOLA VEZ
        setupCartEventListeners();
        // --- FIN DE LA CORRECCIÓN ---

        ticketNumberElement.textContent = String(ticketNumber).padStart(4, '0');
        
        console.log('✅ POS inicializado correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar POS:', error);
    }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePOS);
} else {
    initializePOS();
}
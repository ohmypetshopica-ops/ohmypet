// public/modules/dashboard/dashboard-pos.js

import { supabase } from '../../core/supabase.js';
import { getProducts } from './dashboard.api.js';

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

const saveSale = async (saleData) => {
    const { data, error } = await supabase
        .from('sales')
        .insert([saleData])
        .select();
    
    if (error) {
        console.error('Error al guardar venta:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

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
            price: product.price,
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
        return;
    }
    
    item.quantity = newQuantity;
    renderCart();
    updateTotals();
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
                    <p class="text-xs text-gray-500">S/ ${item.price.toFixed(2)} c/u</p>
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
    
    cartItems.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(btn.dataset.remove));
    });
    
    cartItems.querySelectorAll('[data-decrease]').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = cart.find(i => i.id === btn.dataset.decrease);
            if (item) updateQuantity(item.id, item.quantity - 1);
        });
    });
    
    cartItems.querySelectorAll('[data-increase]').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = cart.find(i => i.id === btn.dataset.increase);
            if (item) updateQuantity(item.id, item.quantity + 1);
        });
    });
    
    processSaleBtn.disabled = false;
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
    paymentMethodSelect.value = 'efectivo';
    updatePaymentButton();
};

const closePaymentModal = () => {
    paymentModal.classList.add('hidden');
};

const updatePaymentButton = () => {
    const paymentMethod = paymentMethodSelect.value;
    const total = parseFloat(modalTotalElement.textContent);
    const customerId = selectedCustomerIdInput.value;
    
    // El cliente es obligatorio
    if (!customerId) {
        confirmPaymentBtn.disabled = true;
        return;
    }
    
    if (paymentMethod === 'efectivo') {
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
    
    if (!customerId) {
        alert('Debe seleccionar un cliente para procesar la venta');
        return;
    }
    
    confirmPaymentBtn.disabled = true;
    confirmPaymentBtn.textContent = 'Procesando...';
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const paymentMethod = paymentMethodSelect.value;
    
    const saleData = {
        sale_date: new Date().toISOString().split('T')[0],
        total_amount: total,
        payment_method: paymentMethod,
        client_id: customerId,
        items: cart.map(item => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            subtotal: item.price * item.quantity
        }))
    };
    
    const { success, error } = await saveSale(saleData);
    
    if (!success) {
        alert('Error al procesar la venta');
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.textContent = 'Confirmar Venta';
        return;
    }
    
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

paymentMethodSelect.addEventListener('change', (e) => {
    if (e.target.value === 'efectivo') {
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
    
    // Verificar elementos del DOM
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
        renderProducts(allProducts);
        
        console.log('🛒 Renderizando carrito...');
        renderCart();
        updateTotals();
        
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
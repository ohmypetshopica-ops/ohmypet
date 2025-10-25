// public/modules/employee/employee-pos.js
// Módulo de punto de venta (POS)

import { state, updateState, resetCart } from './employee-state.js';
import { getProducts, addSale, updateProduct } from '../dashboard/dashboard.api.js';
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let posViewBtn, productSearchEmployee, productsGridEmployee, cartItemsEmployee, totalEmployee;
let clearCartBtnEmployee, processSaleBtnEmployee;
let paymentModalEmployee, modalTotalElementEmployee, customerSearchEmployee, customerResultsEmployee;
let selectedCustomerIdInputEmployee, selectedCustomerDisplayEmployee, selectedCustomerNameEmployee, clearCustomerBtnEmployee;
let cancelPaymentBtnEmployee, confirmPaymentBtnEmployee;
let paymentLinesContainer, addPaymentLineBtn, totalPaidDisplay, totalRemainingDisplay;
let remainingSection, changeSection, totalChangeDisplay;

export const initPOSElements = () => {
    posViewBtn = document.getElementById('pos-view-btn');
    productSearchEmployee = document.getElementById('product-search-employee');
    productsGridEmployee = document.getElementById('products-grid-employee');
    cartItemsEmployee = document.getElementById('cart-items-employee');
    totalEmployee = document.getElementById('total-employee');
    clearCartBtnEmployee = document.getElementById('clear-cart-btn-employee');
    processSaleBtnEmployee = document.getElementById('process-sale-btn-employee');
    
    paymentModalEmployee = document.getElementById('payment-modal-employee');
    modalTotalElementEmployee = document.getElementById('modal-total-employee');
    customerSearchEmployee = document.getElementById('customer-search-employee');
    customerResultsEmployee = document.getElementById('customer-results-employee');
    selectedCustomerIdInputEmployee = document.getElementById('selected-customer-id-employee');
    selectedCustomerDisplayEmployee = document.getElementById('selected-customer-display-employee');
    selectedCustomerNameEmployee = document.getElementById('selected-customer-name-employee');
    clearCustomerBtnEmployee = document.getElementById('clear-customer-btn-employee');
    cancelPaymentBtnEmployee = document.getElementById('cancel-payment-btn-employee');
    confirmPaymentBtnEmployee = document.getElementById('confirm-payment-btn-employee');
    
    paymentLinesContainer = document.getElementById('payment-lines-container');
    addPaymentLineBtn = document.getElementById('add-payment-line-btn');
    totalPaidDisplay = document.getElementById('total-paid-display');
    totalRemainingDisplay = document.getElementById('total-remaining-display');
    remainingSection = document.getElementById('remaining-section');
    changeSection = document.getElementById('change-section');
    totalChangeDisplay = document.getElementById('total-change-display');
};

export const setupPOSListeners = () => {
    posViewBtn?.addEventListener('click', showPOSView);
    productSearchEmployee?.addEventListener('input', handleProductSearch);
    clearCartBtnEmployee?.addEventListener('click', clearCartEmployee);
    processSaleBtnEmployee?.addEventListener('click', openPaymentModalEmployee);
    cancelPaymentBtnEmployee?.addEventListener('click', closePaymentModalEmployee);
    confirmPaymentBtnEmployee?.addEventListener('click', processSaleEmployee);
    addPaymentLineBtn?.addEventListener('click', addPaymentLine);
    
    cartItemsEmployee?.addEventListener('click', handleCartActions);
    customerSearchEmployee?.addEventListener('input', handleCustomerSearch);
    clearCustomerBtnEmployee?.addEventListener('click', clearCustomer);
};

export const loadProducts = async () => {
    const products = await getProducts();
    updateState('allProducts', products);
    renderProductsEmployee(products);
};

const showPOSView = () => {
    document.querySelectorAll('.view-section').forEach(view => view.classList.add('hidden'));
    document.getElementById('pos-view')?.classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-green-600', 'border-t-2', 'border-green-600');
        btn.classList.add('text-gray-500');
    });
    
    posViewBtn?.classList.add('text-green-600');
    document.getElementById('header-title').textContent = 'Punto de Venta';
};

const handleProductSearch = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = term 
        ? state.allProducts.filter(p => p.name.toLowerCase().includes(term))
        : state.allProducts;
    renderProductsEmployee(filtered);
};

const renderProductsEmployee = (products) => {
    if (!productsGridEmployee) return;
    
    productsGridEmployee.innerHTML = products.map(product => `
        <div class="bg-white border rounded-lg p-2 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer" data-product-id="${product.id}">
            <img src="${product.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=D1D5DB&color=FFFFFF`}" 
                 alt="${product.name}" 
                 class="w-full h-20 object-cover rounded-md mb-2">
            <h3 class="font-semibold text-xs leading-tight h-8 line-clamp-2">${product.name}</h3>
            <p class="text-sm font-bold text-green-600 mt-1">S/ ${product.price.toFixed(2)}</p>
            <p class="text-xs text-gray-500">Stock: ${product.stock}</p>
        </div>
    `).join('');
    
    productsGridEmployee.querySelectorAll('[data-product-id]').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            const product = state.allProducts.find(p => p.id == productId);
            if (product && product.stock > 0) addToCartEmployee(product);
        });
    });
};

const addToCartEmployee = (product) => {
    const existingItem = state.cart.find(item => item.id === product.id);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert('No hay suficiente stock disponible');
            return;
        }
    } else {
        state.cart.push({ ...product, quantity: 1 });
    }
    
    renderCartEmployee();
};

const renderCartEmployee = () => {
    if (!cartItemsEmployee) return;
    
    if (state.cart.length === 0) {
        cartItemsEmployee.innerHTML = '<p class="text-center text-gray-400 text-sm">Carrito vacío</p>';
        totalEmployee.textContent = 'S/ 0.00';
        clearCartBtnEmployee.disabled = true;
        processSaleBtnEmployee.disabled = true;
        return;
    }
    
    cartItemsEmployee.innerHTML = state.cart.map(item => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div class="flex-1 min-w-0 mr-2">
                <p class="font-semibold text-sm truncate">${item.name}</p>
                <p class="text-xs text-gray-500">S/ ${item.price.toFixed(2)} c/u</p>
            </div>
            <div class="flex items-center space-x-2">
                <button class="decrease-btn-employee bg-red-500 text-white w-6 h-6 rounded flex items-center justify-center text-sm" data-product-id="${item.id}">-</button>
                <span class="text-sm font-bold">${item.quantity}</span>
                <button class="increase-btn-employee bg-green-500 text-white w-6 h-6 rounded flex items-center justify-center text-sm" data-product-id="${item.id}">+</button>
            </div>
        </div>
    `).join('');
    
    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalEmployee.textContent = `S/ ${total.toFixed(2)}`;
    clearCartBtnEmployee.disabled = false;
    processSaleBtnEmployee.disabled = false;
};

const handleCartActions = (e) => {
    const decreaseBtn = e.target.closest('.decrease-btn-employee');
    const increaseBtn = e.target.closest('.increase-btn-employee');
    
    if (decreaseBtn) {
        const productId = decreaseBtn.dataset.productId;
        const item = state.cart.find(i => i.id == productId);
        if (item) {
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                state.cart = state.cart.filter(i => i.id != productId);
            }
            renderCartEmployee();
        }
    }
    
    if (increaseBtn) {
        const productId = increaseBtn.dataset.productId;
        const item = state.cart.find(i => i.id == productId);
        const product = state.allProducts.find(p => p.id == productId);
        
        if (item && product) {
            if (item.quantity < product.stock) {
                item.quantity++;
                renderCartEmployee();
            } else {
                alert('No hay suficiente stock disponible');
            }
        }
    }
};

const clearCartEmployee = () => {
    resetCart();
    renderCartEmployee();
};

const openPaymentModalEmployee = () => {
    const totalToPay = parseFloat(totalEmployee.textContent.replace('S/ ', '')) || 0;
    
    state.paymentLines = [{ method: 'efectivo', amount: totalToPay }];
    
    selectedCustomerIdInputEmployee.value = '';
    selectedCustomerDisplayEmployee?.classList.add('hidden');
    customerSearchEmployee.value = '';
    customerResultsEmployee?.classList.add('hidden');
    
    modalTotalElementEmployee.textContent = totalToPay.toFixed(2);
    
    renderPaymentLines();
    updatePaymentTotalsAndButtonState();
    
    paymentModalEmployee?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closePaymentModalEmployee = () => {
    paymentModalEmployee?.classList.add('hidden');
    document.body.style.overflow = '';
};

const handleCustomerSearch = (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length < 2) {
        customerResultsEmployee?.classList.add('hidden');
        return;
    }
    
    const matched = state.allClients.filter(c =>
        `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term)
    );
    
    customerResultsEmployee.innerHTML = matched.map(c =>
        `<div class="p-2 cursor-pointer hover:bg-gray-100" data-id="${c.id}" data-name="${c.first_name || ''} ${c.last_name || ''}">${c.first_name || ''} ${c.last_name || ''}</div>`
    ).join('');
    customerResultsEmployee?.classList.remove('hidden');
    
    customerResultsEmployee.querySelectorAll('[data-id]').forEach(item => {
        item.addEventListener('click', () => {
            selectedCustomerIdInputEmployee.value = item.dataset.id;
            selectedCustomerNameEmployee.textContent = item.dataset.name;
            selectedCustomerDisplayEmployee?.classList.remove('hidden');
            customerResultsEmployee?.classList.add('hidden');
            customerSearchEmployee.value = '';
            updatePaymentTotalsAndButtonState();
        });
    });
};

const clearCustomer = () => {
    selectedCustomerIdInputEmployee.value = '';
    selectedCustomerDisplayEmployee?.classList.add('hidden');
    updatePaymentTotalsAndButtonState();
};

const renderPaymentLines = () => {
    if (!paymentLinesContainer) return;
    
    paymentLinesContainer.innerHTML = state.paymentLines.map((line, index) => `
        <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <select class="payment-method-select flex-1 p-2 border rounded-lg" data-index="${index}">
                <option value="efectivo" ${line.method === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                <option value="yape" ${line.method === 'yape' ? 'selected' : ''}>Yape</option>
                <option value="plin" ${line.method === 'plin' ? 'selected' : ''}>Plin</option>
                <option value="tarjeta" ${line.method === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
            </select>
            <input type="number" step="0.01" min="0" value="${line.amount.toFixed(2)}" 
                   class="payment-amount-input w-28 p-2 border rounded-lg" data-index="${index}">
            ${state.paymentLines.length > 1 ? `<button class="remove-payment-line text-red-500 hover:text-red-700" data-index="${index}">✕</button>` : ''}
        </div>
    `).join('');
    
    paymentLinesContainer.querySelectorAll('.payment-method-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            state.paymentLines[index].method = e.target.value;
        });
    });
    
    paymentLinesContainer.querySelectorAll('.payment-amount-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            state.paymentLines[index].amount = parseFloat(e.target.value) || 0;
            updatePaymentTotalsAndButtonState();
        });
    });
    
    paymentLinesContainer.querySelectorAll('.remove-payment-line').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            state.paymentLines.splice(index, 1);
            renderPaymentLines();
            updatePaymentTotalsAndButtonState();
        });
    });
};

const addPaymentLine = () => {
    const totalToPay = parseFloat(modalTotalElementEmployee.textContent) || 0;
    const totalPaid = state.paymentLines.reduce((sum, line) => sum + line.amount, 0);
    const remaining = Math.max(0, totalToPay - totalPaid);
    
    state.paymentLines.push({ method: 'yape', amount: remaining });
    renderPaymentLines();
    updatePaymentTotalsAndButtonState();
};

const updatePaymentTotalsAndButtonState = () => {
    const totalToPay = parseFloat(modalTotalElementEmployee.textContent) || 0;
    const totalPaid = state.paymentLines.reduce((sum, line) => sum + line.amount, 0);
    const remaining = totalToPay - totalPaid;
    
    totalPaidDisplay.textContent = `S/ ${totalPaid.toFixed(2)}`;
    
    if (remaining > 0.001) {
        remainingSection?.classList.remove('hidden');
        changeSection?.classList.add('hidden');
        totalRemainingDisplay.textContent = `S/ ${remaining.toFixed(2)}`;
        confirmPaymentBtnEmployee.disabled = !selectedCustomerIdInputEmployee.value;
    } else {
        remainingSection?.classList.add('hidden');
        changeSection?.classList.remove('hidden');
        totalChangeDisplay.textContent = `S/ ${Math.abs(remaining).toFixed(2)}`;
        confirmPaymentBtnEmployee.disabled = !selectedCustomerIdInputEmployee.value;
    }
};

const processSaleEmployee = async () => {
    if (!selectedCustomerIdInputEmployee.value) {
        alert('Por favor, selecciona un cliente.');
        return;
    }
    
    const totalToPay = parseFloat(modalTotalElementEmployee.textContent) || 0;
    const totalPaid = state.paymentLines.reduce((sum, line) => sum + line.amount, 0);
    
    if (totalPaid < totalToPay - 0.001) {
        alert('El monto pagado es menor al total de la venta.');
        return;
    }
    
    confirmPaymentBtnEmployee.disabled = true;
    confirmPaymentBtnEmployee.textContent = 'Procesando...';
    
    const paymentMethodString = state.paymentLines
        .filter(line => line.amount > 0)
        .map(line => `${line.method.charAt(0).toUpperCase() + line.method.slice(1)} (S/ ${line.amount.toFixed(2)})`)
        .join(', ');
    
    for (const item of state.cart) {
        const saleData = {
            client_id: selectedCustomerIdInputEmployee.value,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            payment_method: paymentMethodString
        };
        
        const { error } = await addSale(saleData);
        if (error) {
            alert('Hubo un error al registrar una de las ventas. Por favor, revisa el stock e inténtalo de nuevo.');
            console.error(error);
            confirmPaymentBtnEmployee.disabled = false;
            confirmPaymentBtnEmployee.textContent = 'Confirmar Venta';
            return;
        }
    }
    
    alert('Venta procesada con éxito');
    
    // Actualizar stock localmente
    state.cart.forEach(cartItem => {
        const product = state.allProducts.find(p => p.id === cartItem.id);
        if (product) product.stock -= cartItem.quantity;
    });
    
    clearCartEmployee();
    closePaymentModalEmployee();
    renderProductsEmployee(state.allProducts);
    
    confirmPaymentBtnEmployee.disabled = false;
    confirmPaymentBtnEmployee.textContent = 'Confirmar Venta';
};
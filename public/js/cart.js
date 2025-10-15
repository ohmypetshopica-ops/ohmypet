// public/js/cart.js

const CART_KEY = 'ohmypet_cart';

// --- ELEMENTOS DEL DOM ---
// Se eliminan los selectores de aquí para evitar errores de carga
const cartModal = document.querySelector('#cart-modal');
const cartModalContent = document.querySelector('#cart-modal-content');
const cartButton = document.querySelector('#cart-button');
const closeCartButton = document.querySelector('#close-cart-button');
const cartItemsContainer = document.querySelector('#cart-items-container');
const cartSubtotal = document.querySelector('#cart-subtotal');
const checkoutButton = document.querySelector('#checkout-button');
const addToCartNotification = document.querySelector('#add-to-cart-notification');

// Modal de confirmación de eliminación
const deleteConfirmModal = document.querySelector('#delete-confirm-modal');
const modalCancelBtn = document.querySelector('#modal-cancel-btn');
const modalConfirmBtn = document.querySelector('#modal-confirm-btn');
let productToDelete = null;

const getCart = () => {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
};

const saveCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

// --- FUNCIÓN CORREGIDA ---
const updateCartBadge = () => {
    // CORRECCIÓN: Se busca el elemento '#cart-badge' justo cuando se necesita.
    // Esto asegura que el header ya se haya cargado en la página.
    const cartCountBadge = document.querySelector('#cart-badge');
    if (!cartCountBadge) {
        return; // Si no está en la página, no hacer nada.
    }
    
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalItems > 0) {
        cartCountBadge.textContent = totalItems;
        cartCountBadge.classList.remove('hidden');
    } else {
        cartCountBadge.classList.add('hidden');
    }
};

const showNotification = () => {
    if (!addToCartNotification) return;

    addToCartNotification.classList.remove('opacity-0', 'translate-y-10');
    addToCartNotification.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
        addToCartNotification.classList.remove('opacity-100', 'translate-y-0');
        addToCartNotification.classList.add('opacity-0', 'translate-y-10');
    }, 2500);
};

export const addProductToCart = (product) => {
    const cart = getCart();
    const existingProduct = cart.find(item => item.id === product.id);
    
    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1,
            stock: product.stock
        });
    }
    
    saveCart(cart);
    updateCartBadge(); // Esta llamada ahora funcionará perfectamente.
    
    if (cartModal && !cartModal.classList.contains('hidden')) {
        renderCart();
    }
    
    showNotification();
};

const updateQuantity = (productId, newQuantity) => {
    const cart = getCart();
    const product = cart.find(item => item.id === productId);
    
    if (product) {
        if (newQuantity <= 0) {
            confirmDelete(productId);
            return;
        }
        
        if (newQuantity > product.stock) {
            alert(`Solo hay ${product.stock} unidades disponibles`);
            renderCart();
            return;
        }
        
        product.quantity = newQuantity;
        saveCart(cart);
        updateCartBadge();
        renderCart();
    }
};

const confirmDelete = (productId) => {
    productToDelete = productId;
    if (deleteConfirmModal) {
        deleteConfirmModal.classList.remove('hidden');
    }
};

const removeFromCart = (productId) => {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    updateCartBadge();
    renderCart();
    if (deleteConfirmModal) {
        deleteConfirmModal.classList.add('hidden');
    }
    productToDelete = null;
};

const createCartItemHTML = (item) => {
    return `
        <div class="cart-item flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-3 hover:shadow-md transition">
            <img class="h-20 w-20 object-cover rounded-lg" src="${item.image_url || 'https://via.placeholder.com/80/10b981/ffffff?text=' + encodeURIComponent(item.name.charAt(0))}" alt="${item.name}">
            <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-gray-800 truncate">${item.name}</h4>
                <p class="text-lg font-extrabold text-green-600 mt-1">S/${item.price.toFixed(2)}</p>
                <div class="flex items-center gap-2 mt-2">
                    <button class="decrease-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold h-8 w-8 rounded-lg transition flex items-center justify-center" data-product-id="${item.id}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
                    </button>
                    <input type="number" value="${item.quantity}" min="1" max="${item.stock}" class="quantity-input w-16 text-center border border-gray-300 rounded-lg py-1 font-semibold text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent" data-product-id="${item.id}">
                    <button class="increase-btn bg-green-600 hover:bg-green-700 text-white font-bold h-8 w-8 rounded-lg transition flex items-center justify-center" data-product-id="${item.id}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
            </div>
            <button class="remove-btn text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition" data-product-id="${item.id}">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    `;
};

const renderCart = () => {
    if (!cartItemsContainer || !cartSubtotal || !checkoutButton) return;
    
    const cart = getCart();
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full py-20"><svg class="h-24 w-24 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg><p class="text-xl font-semibold text-gray-400 mb-2">Tu carrito está vacío</p><p class="text-sm text-gray-500">¡Agrega productos para empezar!</p></div>`;
        cartSubtotal.textContent = 'S/0.00';
        checkoutButton.disabled = true;
        checkoutButton.classList.add('opacity-50', 'cursor-not-allowed');
        return;
    }
    
    cartItemsContainer.innerHTML = cart.map(createCartItemHTML).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartSubtotal.textContent = `S/${total.toFixed(2)}`;
    
    checkoutButton.disabled = false;
    checkoutButton.classList.remove('opacity-50', 'cursor-not-allowed');
    
    setupCartItemListeners();
};

window.renderCart = renderCart;

const setupCartItemListeners = () => {
    document.querySelectorAll('.increase-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.dataset.productId;
            const cart = getCart();
            const product = cart.find(item => item.id === productId);
            if (product) updateQuantity(productId, product.quantity + 1);
        });
    });
    
    document.querySelectorAll('.decrease-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.dataset.productId;
            const cart = getCart();
            const product = cart.find(item => item.id === productId);
            if (product) updateQuantity(productId, product.quantity - 1);
        });
    });
    
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const productId = e.target.dataset.productId;
            const newQuantity = parseInt(e.target.value) || 1;
            updateQuantity(productId, newQuantity);
        });
    });
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.productId));
    });
};

const openCart = () => {
    if (!cartModal || !cartModalContent) return;
    cartModal.classList.remove('hidden');
    setTimeout(() => {
        cartModalContent.style.transform = 'translateX(0)';
    }, 10);
    renderCart();
};

const closeCart = () => {
    if (!cartModal || !cartModalContent) return;
    cartModalContent.style.transform = 'translateX(100%)';
    setTimeout(() => {
        cartModal.classList.add('hidden');
    }, 300);
};

const processCheckout = async () => {
    const cart = getCart();
    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    
    let message = '*¡Nueva Orden de OhMyPet!*\n\n*Productos:*\n';
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name}\n   Cantidad: ${item.quantity}\n   Precio unitario: S/${item.price.toFixed(2)}\n   Subtotal: S/${(item.price * item.quantity).toFixed(2)}\n\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `*TOTAL: S/${total.toFixed(2)}*\n\n_Retiro en tienda - Pago contra entrega_`;
    
    const phoneNumber = "51904343849";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
};

export const setupCartEventListeners = () => {
    if (cartButton) cartButton.addEventListener('click', openCart);
    if (closeCartButton) closeCartButton.addEventListener('click', closeCart);
    if (cartModal) cartModal.addEventListener('click', (e) => { if (e.target === cartModal) closeCart(); });
    if (checkoutButton) checkoutButton.addEventListener('click', processCheckout);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', () => { if(deleteConfirmModal) deleteConfirmModal.classList.add('hidden'); productToDelete = null; });
    if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', () => { if (productToDelete) removeFromCart(productToDelete); });
    if (deleteConfirmModal) deleteConfirmModal.addEventListener('click', (e) => { if (e.target === deleteConfirmModal) { deleteConfirmModal.classList.add('hidden'); productToDelete = null; } });
    
    updateCartBadge();
};
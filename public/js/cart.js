// public/js/cart.js

const CART_KEY = 'ohmypet_cart';

// --- ELEMENTOS DEL DOM ---
const cartModal = document.querySelector('#cart-modal');
const cartModalContent = document.querySelector('#cart-modal-content');
const cartButton = document.querySelector('#cart-button');
const closeCartButton = document.querySelector('#close-cart-button');
const cartItemsContainer = document.querySelector('#cart-items-container');
const cartSubtotal = document.querySelector('#cart-subtotal');
const cartCountBadge = document.querySelector('#cart-count-badge');
const checkoutButton = document.querySelector('#checkout-button');
const addToCartNotification = document.querySelector('#add-to-cart-notification');

// Modal de confirmación de eliminación
const deleteConfirmModal = document.querySelector('#delete-confirm-modal');
const modalCancelBtn = document.querySelector('#modal-cancel-btn');
const modalConfirmBtn = document.querySelector('#modal-confirm-btn');
let productToDelete = null;

/**
 * Obtiene el carrito desde localStorage
 */
const getCart = () => {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
};

/**
 * Guarda el carrito en localStorage
 */
const saveCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

/**
 * Actualiza el badge del contador del carrito
 */
const updateCartBadge = () => {
    // Si el badge no existe en la página, salir sin error
    if (!cartCountBadge) return;
    
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalItems > 0) {
        cartCountBadge.textContent = totalItems;
        cartCountBadge.classList.remove('hidden');
    } else {
        cartCountBadge.classList.add('hidden');
    }
};

/**
 * Muestra una notificación temporal
 */
const showNotification = () => {
    addToCartNotification.style.transform = 'translateY(0) translateX(-50%)';
    addToCartNotification.style.opacity = '1';
    
    setTimeout(() => {
        addToCartNotification.style.transform = 'translateY(20px) translateX(-50%)';
        addToCartNotification.style.opacity = '0';
    }, 2000);
};

/**
 * Agrega un producto al carrito
 */
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
    updateCartBadge();
    renderCart();
    showNotification();
};

/**
 * Actualiza la cantidad de un producto
 */
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
            return;
        }
        
        product.quantity = newQuantity;
        saveCart(cart);
        updateCartBadge();
        renderCart();
    }
};

/**
 * Muestra el modal de confirmación de eliminación
 */
const confirmDelete = (productId) => {
    productToDelete = productId;
    deleteConfirmModal.classList.remove('hidden');
};

/**
 * Elimina un producto del carrito
 */
const removeFromCart = (productId) => {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    updateCartBadge();
    renderCart();
    deleteConfirmModal.classList.add('hidden');
    productToDelete = null;
};

/**
 * Crea el HTML de un item del carrito
 */
const createCartItemHTML = (item) => {
    return `
        <div class="cart-item flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-3 hover:shadow-md transition">
            <img class="h-20 w-20 object-cover rounded-lg" 
                 src="${item.image_url || 'https://via.placeholder.com/80/10b981/ffffff?text=' + encodeURIComponent(item.name.charAt(0))}" 
                 alt="${item.name}">
            
            <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-gray-800 truncate">${item.name}</h4>
                <p class="text-lg font-extrabold text-green-600 mt-1">S/${item.price.toFixed(2)}</p>
                
                <div class="flex items-center gap-2 mt-2">
                    <button class="decrease-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold h-8 w-8 rounded-lg transition flex items-center justify-center" 
                            data-product-id="${item.id}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                        </svg>
                    </button>
                    
                    <input type="number" 
                           value="${item.quantity}" 
                           min="1" 
                           max="${item.stock}"
                           class="quantity-input w-16 text-center border border-gray-300 rounded-lg py-1 font-semibold text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                           data-product-id="${item.id}">
                    
                    <button class="increase-btn bg-green-600 hover:bg-green-700 text-white font-bold h-8 w-8 rounded-lg transition flex items-center justify-center" 
                            data-product-id="${item.id}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>
            
            <button class="remove-btn text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition" 
                    data-product-id="${item.id}">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    `;
};

/**
 * Renderiza el carrito completo
 */
const renderCart = () => {
    const cart = getCart();
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full py-20">
                <svg class="h-24 w-24 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p class="text-xl font-semibold text-gray-400 mb-2">Tu carrito está vacío</p>
                <p class="text-sm text-gray-500">¡Agrega productos para empezar!</p>
            </div>
        `;
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

/**
 * Configura los event listeners de los items del carrito
 */
const setupCartItemListeners = () => {
    // Botones de aumentar
    document.querySelectorAll('.increase-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.dataset.productId;
            const cart = getCart();
            const product = cart.find(item => item.id === productId);
            if (product) {
                updateQuantity(productId, product.quantity + 1);
            }
        });
    });
    
    // Botones de disminuir
    document.querySelectorAll('.decrease-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.dataset.productId;
            const cart = getCart();
            const product = cart.find(item => item.id === productId);
            if (product) {
                updateQuantity(productId, product.quantity - 1);
            }
        });
    });
    
    // Inputs de cantidad
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const productId = e.target.dataset.productId;
            const newQuantity = parseInt(e.target.value) || 1;
            updateQuantity(productId, newQuantity);
        });
    });
    
    // Botones de eliminar
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            confirmDelete(btn.dataset.productId);
        });
    });
};

/**
 * Abre el modal del carrito
 */
const openCart = () => {
    cartModal.classList.remove('hidden');
    setTimeout(() => {
        cartModalContent.style.transform = 'translateX(0)';
    }, 10);
    renderCart();
};

/**
 * Cierra el modal del carrito
 */
const closeCart = () => {
    cartModalContent.style.transform = 'translateX(100%)';
    setTimeout(() => {
        cartModal.classList.add('hidden');
    }, 300);
};

/**
 * Procesa el checkout
 */
const processCheckout = async () => {
    const cart = getCart();
    
    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    
    // Construir mensaje de WhatsApp
    let message = '*¡Nueva Orden de OhMyPet!*\n\n';
    message += '*Productos:*\n';
    
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name}\n`;
        message += `   Cantidad: ${item.quantity}\n`;
        message += `   Precio unitario: S/${item.price.toFixed(2)}\n`;
        message += `   Subtotal: S/${(item.price * item.quantity).toFixed(2)}\n\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `*TOTAL: S/${total.toFixed(2)}*\n\n`;
    message += '_Retiro en tienda - Pago contra entrega_';
    
    const phoneNumber = "51904343849";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
    
    // Opcional: Limpiar carrito después de checkout
    // localStorage.removeItem(CART_KEY);
    // updateCartBadge();
    // closeCart();
};

/**
 * Configura todos los event listeners del carrito
 */
export const setupCartEventListeners = () => {
    if (cartButton) {
        cartButton.addEventListener('click', openCart);
    }
    
    if (closeCartButton) {
        closeCartButton.addEventListener('click', closeCart);
    }
    
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                closeCart();
            }
        });
    }
    
    if (checkoutButton) {
        checkoutButton.addEventListener('click', processCheckout);
    }
    
    // Modal de confirmación
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            deleteConfirmModal.classList.add('hidden');
            productToDelete = null;
        });
    }
    
    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', () => {
            if (productToDelete) {
                removeFromCart(productToDelete);
            }
        });
    }
    
    // Click fuera del modal de confirmación
    if (deleteConfirmModal) {
        deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === deleteConfirmModal) {
                deleteConfirmModal.classList.add('hidden');
                productToDelete = null;
            }
        });
    }
    
    updateCartBadge();
};
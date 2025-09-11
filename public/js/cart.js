// public/js/cart.js

const CART_KEY = 'ohmypet_cart';

// --- Funciones de Ayuda para localStorage ---
const getCart = () => JSON.parse(localStorage.getItem(CART_KEY)) || [];
const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

// --- Lógica Principal del Carrito ---

/**
 * Agrega un producto o incrementa su cantidad.
 */
export const addProductToCart = (product) => {
    const cart = getCart();
    const existingProduct = cart.find(item => item.id === product.id);

    if (existingProduct) {
        existingProduct.quantity += 1;
        alert(`Se agregó otra unidad de ${product.name}.`);
    } else {
        cart.push({ ...product, quantity: 1 });
        alert(`¡${product.name} agregado al carrito!`);
    }

    saveCart(cart);
    updateCartBadge();
    renderCartItems();
};

/**
 * Elimina un producto del carrito.
 */
const removeProductFromCart = (productId) => {
    const cart = getCart().filter(item => item.id !== productId);
    saveCart(cart);
    updateCartBadge();
    renderCartItems();
};

/**
 * Actualiza la cantidad de un producto.
 */
const updateProductQuantity = (productId, newQuantity) => {
    const cart = getCart();
    const product = cart.find(item => item.id === productId);

    if (product) {
        product.quantity = newQuantity > 0 ? newQuantity : 1;
    }
    
    saveCart(cart);
    updateCartBadge();
    renderCartItems();
};

// --- Funciones de Renderizado de UI ---

/**
 * Actualiza la insignia del carrito en el encabezado.
 */
export const updateCartBadge = () => {
    const badge = document.querySelector('#cart-count-badge');
    const totalItems = getCart().reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
        badge.textContent = totalItems;
        badge.classList.toggle('hidden', totalItems === 0);
    }
};

/**
 * Renderiza los items en la ventana modal del carrito.
 */
const renderCartItems = () => {
    const cart = getCart();
    const cartContainer = document.querySelector('#cart-items-container');
    const subtotalElement = document.querySelector('#cart-subtotal');
    
    if (!cartContainer || !subtotalElement) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-center text-gray-500 mt-8">Tu carrito está vacío.</p>';
        subtotalElement.textContent = '$0.00';
        return;
    }

    let subtotal = 0;
    cartContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="flex items-center justify-between py-3 border-b" data-product-id="${item.id}">
                <div class="flex items-center">
                    <img src="${item.image_url || 'https://via.placeholder.com/100'}" alt="${item.name}" class="h-16 w-16 object-cover rounded-md mr-4">
                    <div>
                        <p class="font-bold text-gray-800">${item.name}</p>
                        <p class="text-sm text-gray-600">$${item.price.toFixed(2)}</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <input type="number" value="${item.quantity}" min="1" class="w-14 p-1 border rounded-md text-center quantity-input">
                    <button class="ml-3 text-red-500 hover:text-red-700 remove-item-btn">
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
};

// --- Configuración de Eventos ---

/**
 * Inicializa todos los eventos del carrito (abrir/cerrar modal, etc.).
 */
export const setupCartEventListeners = () => {
    const cartModal = document.querySelector('#cart-modal');
    const cartModalContent = document.querySelector('#cart-modal-content');
    const openBtn = document.querySelector('#cart-button');
    const closeBtn = document.querySelector('#close-cart-button');
    const cartContainer = document.querySelector('#cart-items-container');
    const checkoutBtn = document.querySelector('#checkout-button');

    const openCart = () => {
        renderCartItems();
        cartModal.classList.remove('hidden');
        setTimeout(() => cartModalContent.classList.remove('translate-x-full'), 10);
    };
    const closeCart = () => {
        cartModalContent.classList.add('translate-x-full');
        setTimeout(() => cartModal.classList.add('hidden'), 300);
    };
    
    if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (cartModal) cartModal.addEventListener('click', (e) => e.target === cartModal && closeCart());

    if (cartContainer) {
        cartContainer.addEventListener('click', (e) => {
            const itemElement = e.target.closest('[data-product-id]');
            if (!itemElement) return;
            const productId = parseInt(itemElement.dataset.productId);
            if (e.target.closest('.remove-item-btn')) {
                removeProductFromCart(productId);
            }
        });
        cartContainer.addEventListener('change', (e) => {
            const itemElement = e.target.closest('[data-product-id]');
            if (itemElement && e.target.classList.contains('quantity-input')) {
                updateProductQuantity(parseInt(itemElement.dataset.productId), parseInt(e.target.value));
            }
        });
    }
    
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
        const cart = getCart();
        if (cart.length === 0) return alert('Tu carrito está vacío.');

        let message = '*¡Nuevo Pedido OhMyPet!*\n\nHola, me gustaría pedir:\n\n';
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.forEach(item => {
            message += `*- ${item.name}* (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}\n`;
        });
        message += `\n*Total a Pagar: $${total.toFixed(2)}*`;

        const phoneNumber = "51904343849";
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
    });
};
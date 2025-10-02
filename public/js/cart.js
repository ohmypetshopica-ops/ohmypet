const CART_KEY = 'ohmypet_cart';

let notificationTimeout;

/**
 * Muestra una notificación temporal en la pantalla.
 * @param {string} message - El mensaje que se mostrará en la notificación.
 */
const showNotification = (message) => {
    const notification = document.querySelector('#add-to-cart-notification');
    if (!notification) return;

    // Limpiar cualquier notificación anterior para reiniciar el temporizador
    clearTimeout(notificationTimeout);

    // Actualizar mensaje y mostrar
    notification.querySelector('p').textContent = message;
    notification.classList.remove('translate-y-20', 'opacity-0');

    // Ocultar después de 3 segundos
    notificationTimeout = setTimeout(() => {
        notification.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
};

const getCart = () => JSON.parse(localStorage.getItem(CART_KEY)) || [];
const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

export const addProductToCart = (product) => {
    const cart = getCart();
    const existingProduct = cart.find(item => item.id == product.id);

    if (existingProduct) {
        existingProduct.quantity += 1;
        // ===== LÍNEA MODIFICADA =====
        showNotification(`Se agregó otra unidad de ${product.name}.`);
    } else {
        cart.push({ ...product, quantity: 1 });
        // ===== LÍNEA MODIFICADA =====
        showNotification(`¡${product.name} agregado al carrito!`);
    }

    saveCart(cart);
    updateCartBadge();
    
    const cartModal = document.querySelector('#cart-modal');
    if (cartModal && !cartModal.classList.contains('hidden')) {
        renderCartItems();
    }
};

const removeProductFromCart = (productId) => {
    let cart = getCart();
    cart = cart.filter(item => item.id != productId);
    saveCart(cart);
    updateCartBadge();
    renderCartItems();
};

const updateProductQuantity = (productId, newQuantity) => {
    const cart = getCart();
    const product = cart.find(item => item.id == productId);

    if (product) {
        product.quantity = newQuantity > 0 ? newQuantity : 1;
    }
    
    saveCart(cart);
    updateCartBadge();
    renderCartItems();
};

export const updateCartBadge = () => {
    const badge = document.querySelector('#cart-count-badge');
    if (!badge) return;
    
    const totalItems = getCart().reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = totalItems;
    badge.classList.toggle('hidden', totalItems === 0);
};

const renderCartItems = () => {
    const cart = getCart();
    const cartContainer = document.querySelector('#cart-items-container');
    const subtotalElement = document.querySelector('#cart-subtotal');
    
    if (!cartContainer || !subtotalElement) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-center text-gray-500 mt-8">Tu carrito está vacío.</p>';
        subtotalElement.textContent = 'S/0.00';
        return;
    }

    let subtotal = 0;
    cartContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="flex items-center justify-between py-3 border-b" data-product-id="${item.id}">
                <div class="flex items-center">
                    <img src="${item.image_url || 'https://placehold.co/100x100'}" alt="${item.name}" class="h-16 w-16 object-cover rounded-md mr-4">
                    <div>
                        <p class="font-bold text-gray-800">${item.name}</p>
                        <p class="text-sm text-gray-600">S/${item.price.toFixed(2)}</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <input type="number" value="${item.quantity}" min="1" class="w-14 p-1 border rounded-md text-center quantity-input">
                    <button class="ml-3 text-red-500 hover:text-red-700 remove-item-btn" title="Eliminar producto">
                        <svg class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    subtotalElement.textContent = `S/${subtotal.toFixed(2)}`;
};

export const setupCartEventListeners = () => {
    const cartModal = document.querySelector('#cart-modal');
    const cartModalContent = document.querySelector('#cart-modal-content');
    const openBtn = document.querySelector('#cart-button');
    const closeBtn = document.querySelector('#close-cart-button');
    const cartContainer = document.querySelector('#cart-items-container');
    const checkoutBtn = document.querySelector('#checkout-button');

    if (!cartModal || !openBtn || !closeBtn) return;

    const openCart = () => {
        renderCartItems();
        cartModal.classList.remove('hidden');
        setTimeout(() => {
            if (cartModalContent) cartModalContent.classList.remove('translate-x-full');
        }, 10);
    };

    const closeCart = () => {
        if (cartModalContent) cartModalContent.classList.add('translate-x-full');
        setTimeout(() => cartModal.classList.add('hidden'), 300);
    };
    
    openBtn.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
    closeBtn.addEventListener('click', closeCart);
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) closeCart();
    });

    if (cartContainer) {
        cartContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                const itemElement = e.target.closest('[data-product-id]');
                if (itemElement) {
                    updateProductQuantity(itemElement.dataset.productId, parseInt(e.target.value));
                }
            }
        });

        cartContainer.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.remove-item-btn');
            if (removeButton) {
                const itemElement = removeButton.closest('[data-product-id]');
                if (itemElement) {
                    const productId = itemElement.dataset.productId;
                    if (confirm('¿Seguro que quieres eliminar este producto del carrito?')) {
                        removeProductFromCart(productId);
                    }
                }
            }
        });
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            const cart = getCart();
            if (cart.length === 0) {
                // En lugar de una alerta, podríamos usar nuestra nueva notificación
                showNotification('Tu carrito está vacío.');
                return;
            }

            let message = '*¡Nuevo Pedido OhMyPet!*\n\nHola, me gustaría pedir:\n\n';
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            cart.forEach(item => {
                message += `*- ${item.name}* (x${item.quantity}) - S/${(item.price * item.quantity).toFixed(2)}\n`;
            });
            message += `\n*Total a Pagar: S/${total.toFixed(2)}*`;

            const phoneNumber = "51904343849";
            window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
        });
    }
};
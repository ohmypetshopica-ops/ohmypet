document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayProducts();
    renderCart();

    // --- MANEJADORES DE EVENTOS ---
    document.querySelector('#product-grid').addEventListener('click', handleAddToCartClick);
    document.querySelector('#cart-bubble-btn').addEventListener('click', toggleCart); 
    document.querySelector('#close-cart-btn').addEventListener('click', toggleCart);
    document.querySelector('#cart-backdrop').addEventListener('click', toggleCart);
    document.querySelector('#cart-items').addEventListener('click', handleCartActions);
});


// =================================================================================
// FUNCIONES DE LA TIENDA
// =================================================================================

async function fetchAndDisplayProducts() {
    const { data: productos, error } = await supabase.from('productos').select('*').order('nombre');
    if (error) { console.error('Error cargando productos:', error); return; }

    const productGrid = document.querySelector('#product-grid');
    productGrid.innerHTML = productos.map(producto => `
        <div class="bg-white rounded-xl shadow-md overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-lg flex flex-col">
            <div class="h-48 flex items-center justify-center bg-white p-4">
                <img class="max-h-full max-w-full object-contain" src="${producto.imagen_url || 'https://via.placeholder.com/400x300.png?text=Sin+Imagen'}" alt="Imagen de ${producto.nombre}">
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <h3 class="text-md font-bold text-gray-800 truncate">${producto.nombre}</h3>
                <p class="text-xl font-bold text-teal-800 mt-1">S/ ${parseFloat(producto.precio).toFixed(2)}</p>
                <button class="add-to-cart-btn w-full mt-auto pt-3 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                    data-id="${producto.id}" data-nombre="${producto.nombre}" data-precio="${producto.precio}" data-imagen_url="${producto.imagen_url || ''}">
                    Agregar al Carrito
                </button>
            </div>
        </div>
    `).join('');
}

function handleAddToCartClick(event) {
    const button = event.target.closest('.add-to-cart-btn');
    if (!button) return;

    const price = parseFloat(button.dataset.precio);
    if (isNaN(price)) {
        console.error('Error: El precio del producto es inválido.', button.dataset);
        return;
    }

    const product = {
        id: button.dataset.id,
        nombre: button.dataset.nombre,
        precio: price,
        imagen_url: button.dataset.imagen_url,
    };

    addProductToCart(product);
    
    button.textContent = '¡Agregado! ✔️';
    button.disabled = true;
    setTimeout(() => {
        button.textContent = 'Agregar al Carrito';
        button.disabled = false;
    }, 1500);
}


// =================================================================================
// FUNCIONES DEL CARRITO
// =================================================================================

function toggleCart() {
    document.querySelector('#cart-sidebar').classList.toggle('translate-x-full');
    document.querySelector('#cart-backdrop').classList.toggle('hidden');
}

function addProductToCart(product) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingProductIndex = cart.findIndex(item => String(item.id) === String(product.id));

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    showToast(`"${product.nombre}" fue agregado al carrito.`);
}

function renderCart() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsContainer = document.querySelector('#cart-items');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<div class="text-center mt-10"><p class="text-xl text-gray-600">¡Tu carrito está vacío!</p></div>`;
    } else {
        cartItemsContainer.innerHTML = cart.map(item => {
            const itemPrice = typeof item.precio === 'number' ? item.precio.toFixed(2) : '0.00';
            return `
                <div class="flex items-center gap-4 py-2 border-b">
                    <img src="${item.imagen_url || 'https://via.placeholder.com/150'}" alt="${item.nombre}" class="w-16 h-16 rounded object-cover">
                    <div class="flex-grow"><p class="font-bold">${item.nombre}</p><p class="text-sm text-gray-600">S/ ${itemPrice}</p></div>
                    <div class="flex items-center gap-3"><button class="update-quantity-btn text-lg font-bold" data-id="${item.id}" data-change="-1">-</button><span>${item.quantity}</span><button class="update-quantity-btn text-lg font-bold" data-id="${item.id}" data-change="1">+</button></div>
                    <button class="remove-item-btn text-red-500" data-id="${item.id}"><ion-icon name="trash-outline" class="text-xl"></ion-icon></button>
                </div>
            `;
        }).join('');
    }
    updateCartSummary(cart);
    updateCartBubble(cart);
}

function handleCartActions(event) {
    const button = event.target.closest('button');
    if (!button) return;
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const productId = button.dataset.id;
    if (!productId) return;

    const productIndex = cart.findIndex(item => String(item.id) === String(productId));
    if (productIndex === -1) return;

    if (button.classList.contains('update-quantity-btn')) {
        const change = parseInt(button.dataset.change);
        cart[productIndex].quantity += change;
        if (cart[productIndex].quantity <= 0) {
            cart.splice(productIndex, 1);
        }
    } else if (button.classList.contains('remove-item-btn')) {
        cart.splice(productIndex, 1);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
}

function updateCartSummary(cart) {
    const total = cart.reduce((sum, item) => {
        const price = typeof item.precio === 'number' ? item.precio : 0;
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
        return sum + price * quantity;
    }, 0);
    document.querySelector('#cart-total').textContent = `S/ ${total.toFixed(2)}`;
}

function updateCartBubble(cart) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const bubble = document.querySelector('#cart-item-count');
    bubble.textContent = totalItems;
    bubble.style.display = totalItems > 0 ? 'flex' : 'none';
}

function showToast(message) {
    const container = document.querySelector('#toast-container');
    const toast = document.createElement('div');
    toast.className = 'bg-green-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full';
    toast.textContent = message;
    
    container.appendChild(toast);

    setTimeout(() => { toast.classList.remove('translate-x-full'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}
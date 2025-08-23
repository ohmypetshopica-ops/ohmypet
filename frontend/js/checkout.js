document.addEventListener('DOMContentLoaded', () => {
    displayOrderSummary();

    const confirmButton = document.querySelector('#confirm-order-btn');
    if(confirmButton) {
        confirmButton.addEventListener('click', handleConfirmOrder);
    }
});

/**
 * Muestra el resumen del pedido en la página de checkout.
 */
function displayOrderSummary() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const summaryContainer = document.querySelector('#order-summary');
    const totalAmountElement = document.querySelector('#total-amount');

    if (!summaryContainer || !totalAmountElement || cart.length === 0) {
        // Si no hay nada en el carrito, redirige a la tienda.
        window.location.href = 'tienda.html';
        return;
    }

    // Limpiar resumen anterior
    summaryContainer.innerHTML = '';
    
    // Rellenar con productos del carrito
    cart.forEach(item => {
        summaryContainer.innerHTML += `
            <div class="flex justify-between items-center text-gray-700">
                <span>${item.nombre} (x${item.quantity})</span>
                <span class="font-semibold">S/ ${(item.precio * item.quantity).toFixed(2)}</span>
            </div>
        `;
    });

    // Calcular y mostrar el total
    const total = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
    totalAmountElement.textContent = `S/ ${total.toFixed(2)}`;
}

/**
 * Maneja la confirmación del pedido.
 */
function handleConfirmOrder() {
    // 1. (Opcional) Aquí es donde en el futuro llamarías a la función de Supabase.

    // 2. Muestra la vista de confirmación
    document.querySelector('#checkout-view').classList.add('hidden');
    document.querySelector('#confirmation-view').classList.remove('hidden');

    // 3. Genera un código de pedido de ejemplo
    const orderIdElement = document.querySelector('#order-id');
    const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    orderIdElement.textContent = `OHMYPET-${randomCode}`;

    // 4. Limpia el carrito de localStorage
    localStorage.removeItem('cart');
}
// frontend/js/checkout.js
import { supabase } from '../supabase-client.js';

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

    if (!summaryContainer || !totalAmountElement) return;

    if (cart.length === 0) {
        summaryContainer.innerHTML = '<p class="text-gray-500">No hay productos en tu carrito.</p>';
        document.querySelector('#confirm-order-btn').disabled = true; // Deshabilita el botón si no hay nada
        return;
    }

    summaryContainer.innerHTML = '';
    cart.forEach(item => {
        summaryContainer.innerHTML += `
            <div class="flex justify-between items-center text-gray-700">
                <span>${item.nombre} (x${item.quantity})</span>
                <span class="font-semibold">S/ ${(item.precio * item.quantity).toFixed(2)}</span>
            </div>
        `;
    });

    const total = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
    totalAmountElement.textContent = `S/ ${total.toFixed(2)}`;
}

/**
 * Maneja la confirmación del pedido, guardándolo en la base de datos.
 */
async function handleConfirmOrder() {
    const confirmButton = document.querySelector('#confirm-order-btn');
    confirmButton.disabled = true;
    confirmButton.textContent = 'Procesando...';

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert('Tu carrito está vacío.');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Confirmar Pedido';
        return;
    }

    try {
        // 1. Obtener la sesión del usuario actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            alert('Debes iniciar sesión para poder realizar un pedido.');
            window.location.href = 'login.html'; // Redirige al login
            return;
        }
        const userId = session.user.id;
        const userEmail = session.user.email;
        const userName = session.user.user_metadata?.nombre || userEmail; // Usa el nombre si está, si no el email

        // 2. Crear el código del pedido
        const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const orderCode = `OHMYPET-${randomCode}`;
        const total = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);

        // 3. Insertar el pedido en la tabla 'pedidos'
        const { data: pedidoData, error: pedidoError } = await supabase
            .from('pedidos')
            .insert({
                user_id: userId,
                codigo_pedido: orderCode,
                total: total,
                cliente_email: userEmail,
                cliente_nombre: userName
            })
            .select()
            .single();

        if (pedidoError) throw pedidoError;

        // 4. Preparar los items del pedido
        const pedidoItems = cart.map(item => ({
            pedido_id: pedidoData.id,
            producto_id: item.id,
            cantidad: item.quantity,
            precio_unitario: item.precio
        }));

        // 5. Insertar los items en 'pedido_items'
        const { error: itemsError } = await supabase.from('pedido_items').insert(pedidoItems);
        if (itemsError) throw itemsError;

        // 6. (Opcional pero recomendado) Actualizar el stock de cada producto
        for (const item of cart) {
            const { error: stockError } = await supabase.rpc('actualizar_stock', {
                producto_id_param: item.id,
                cantidad_param: item.quantity
            });
            if (stockError) console.error(`Error actualizando stock para ${item.nombre}:`, stockError);
        }

        // 7. Mostrar la vista de confirmación
        document.querySelector('#checkout-view').classList.add('hidden');
        document.querySelector('#confirmation-view').classList.remove('hidden');
        document.querySelector('#order-id').textContent = orderCode;

        // 8. Limpiar el carrito
        localStorage.removeItem('cart');

    } catch (error) {
        alert(`Hubo un error al procesar tu pedido: ${error.message}`);
        confirmButton.disabled = false;
        confirmButton.textContent = 'Confirmar Pedido';
    }
}

// Es necesario crear esta función en la base de datos para que el stock se actualice de forma segura.
// Ve a Supabase > SQL Editor y ejecuta:
/*
CREATE OR REPLACE FUNCTION actualizar_stock(producto_id_param bigint, cantidad_param int)
RETURNS void AS $$
BEGIN
  UPDATE public.productos
  SET stock = stock - cantidad_param
  WHERE id = producto_id_param;
END;
$$ LANGUAGE plpgsql;
*/
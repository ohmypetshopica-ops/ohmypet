// public/modules/dashboard/dashboard-sales.js

import { supabase } from '../../core/supabase.js';
import { getSales, updateSaleItem } from './dashboard.api.js'; // Importar updateSaleItem

// --- ELEMENTOS DEL DOM ---
const salesTableBody = document.querySelector('#sales-table-body');

// Modal de detalles
const saleDetailsModal = document.querySelector('#sale-details-modal');
const closeSaleDetailsBtn = document.querySelector('#close-sale-details-btn');
const saleDetailsContent = document.querySelector('#sale-details-content');
const deleteSaleBtn = document.querySelector('#delete-sale-btn');
const editSaleBtn = document.querySelector('#edit-sale-btn'); // Botón Editar en modal detalles

// Modal de Edición
const editSaleModal = document.querySelector('#edit-sale-modal');
const closeEditSaleBtn = document.querySelector('#close-edit-sale-btn');
const cancelEditSaleBtn = document.querySelector('#cancel-edit-sale-btn');
const saveSaleBtn = document.querySelector('#save-sale-btn');
const editSaleForm = document.querySelector('#edit-sale-form');
const editSaleMessage = document.querySelector('#edit-sale-message');
const editSaleDate = document.querySelector('#edit-sale-date');
const editPaymentMethod = document.querySelector('#edit-payment-method');
const editSaleItemsContainer = document.querySelector('#edit-sale-items-container');


// --- VARIABLES GLOBALES ---
let allSales = [];
let groupedSalesData = new Map(); // Almacenar datos agrupados
let selectedSaleGroup = null;

// --- RENDERIZADO DE LA TABLA ---
const renderSalesTable = async () => {
    salesTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">Cargando...</td></tr>`;
    allSales = await getSales();
    
    if (allSales.length === 0) {
        salesTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No hay ventas registradas.</td></tr>`;
        return;
    }
    
    // Agrupar ventas por fecha, cliente y método de pago
    groupedSalesData.clear();
    
    allSales.forEach(sale => {
        const saleDate = new Date(sale.created_at);
        const dateKey = saleDate.toISOString().split('T')[0];
        // Agrupar por hora y minuto para diferenciar ventas cercanas
        const timeKey = saleDate.toTimeString().split(' ')[0].substring(0, 5); 
        
        // Usar sale.payment_method en la clave
        const key = `${dateKey}-${timeKey}-${sale.client_id}-${sale.payment_method}`;
        
        if (!groupedSalesData.has(key)) {
            groupedSalesData.set(key, {
                key: key,
                created_at: sale.created_at,
                client: sale.client,
                client_id: sale.client_id,
                payment_method: sale.payment_method,
                products: [],
                total: 0,
                sale_ids: [] // Guardar los IDs de las ventas individuales
            });
        }
        
        const group = groupedSalesData.get(key);
        group.products.push({
            id: sale.id, // ID de la fila 'sales'
            name: sale.product?.name || 'Producto Eliminado',
            quantity: sale.quantity,
            unit_price: sale.unit_price,
            price: sale.total_price,
            product_id: sale.product_id
        });
        group.sale_ids.push(sale.id); // Guardar ID
        group.total += sale.total_price;
    });
    
    const salesArray = Array.from(groupedSalesData.values()).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    salesTableBody.innerHTML = salesArray.map(sale => {
        const clientName = (sale.client?.first_name && sale.client?.last_name) 
            ? `${sale.client.first_name} ${sale.client.last_name}` 
            : sale.client?.full_name || 'Cliente Eliminado';
        
        const productsList = sale.products.map(p => 
            `${p.name} (x${p.quantity})`
        ).join(', ');
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer" data-sale-key="${sale.key}">
                <td class="px-6 py-4 text-sm text-gray-700">${new Date(sale.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(sale.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                <td class="px-6 py-4 text-sm font-medium text-gray-900">${clientName}</td>
                <td class="px-6 py-4 text-sm text-gray-800">${productsList}</td>
                <td class="px-6 py-4 text-sm font-bold text-green-600">S/ ${sale.total.toFixed(2)}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${sale.payment_method}</td>
                <td class="px-6 py-4 text-center">
                    <button class="text-blue-600 hover:text-blue-800 font-semibold text-sm">Ver Detalles</button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Event listeners para abrir detalles
    salesTableBody.querySelectorAll('tr[data-sale-key]').forEach(row => {
        row.addEventListener('click', (e) => {
            const saleKey = row.dataset.saleKey;
            const sale = salesArray.find(s => s.key === saleKey);
            if (sale) openSaleDetails(sale);
        });
    });
};

// --- MODAL DE DETALLES ---
const openSaleDetails = (sale) => {
    selectedSaleGroup = sale;
    
    const clientName = (sale.client?.first_name && sale.client?.last_name) 
        ? `${sale.client.first_name} ${sale.client.last_name}` 
        : sale.client?.full_name || 'Cliente Eliminado';
    
    const productsHTML = sale.products.map(p => `
        <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
                <p class="font-medium text-gray-800">${p.name}</p>
                <p class="text-xs text-gray-500">Cantidad: ${p.quantity} × S/ ${p.unit_price.toFixed(2)}</p>
            </div>
            <p class="font-bold text-gray-900">S/ ${p.price.toFixed(2)}</p>
        </div>
    `).join('');
    
    saleDetailsContent.innerHTML = `
        <div class="space-y-4">
            <div class="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <h3 class="text-lg font-bold text-gray-800 mb-2">Información de la Venta</h3>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p class="text-gray-600">Fecha:</p>
                        <p class="font-semibold">${new Date(sale.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Hora:</p>
                        <p class="font-semibold">${new Date(sale.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Cliente:</p>
                        <p class="font-semibold">${clientName}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Método de Pago:</p>
                        <p class="font-semibold">${sale.payment_method}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg p-4">
                <h4 class="font-semibold text-gray-800 mb-3">Productos</h4>
                ${productsHTML}
                <div class="flex justify-between items-center pt-3 mt-3 border-t-2 border-gray-300">
                    <p class="text-lg font-bold text-gray-800">Total:</p>
                    <p class="text-2xl font-bold text-green-600">S/ ${sale.total.toFixed(2)}</p>
                </div>
            </div>
        </div>
    `;
    
    saleDetailsModal.classList.remove('hidden');
};

const closeSaleDetails = () => {
    saleDetailsModal.classList.add('hidden');
    selectedSaleGroup = null;
};

// --- MODAL DE EDICIÓN ---
const openEditModal = () => {
    if (!selectedSaleGroup) return;

    // Formatear fecha para datetime-local (YYYY-MM-DDTHH:mm)
    const saleDate = new Date(selectedSaleGroup.created_at);
    const localDateTime = new Date(saleDate.getTime() - (saleDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    editSaleDate.value = localDateTime;
    editPaymentMethod.value = selectedSaleGroup.payment_method;
    editSaleMessage.classList.add('hidden');

    // Renderizar items editables
    editSaleItemsContainer.innerHTML = selectedSaleGroup.products.map(p => `
        <div class="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50" data-sale-id="${p.id}">
            <div class="col-span-3">
                <p class="font-semibold text-gray-800">${p.name}</p>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                <input type="number" value="${p.quantity}" min="1" step="1" 
                       class="edit-item-quantity w-full p-2 border border-gray-300 rounded-lg">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Monto Total (S/)</label>
                <input type="number" value="${p.price.toFixed(2)}" min="0" step="0.10" 
                       class="edit-item-price w-full p-2 border border-gray-300 rounded-lg">
            </div>
        </div>
    `).join('');
    
    saleDetailsModal.classList.add('hidden');
    editSaleModal.classList.remove('hidden');
};

const closeEditModal = () => {
    editSaleModal.classList.add('hidden');
    // No reseteamos selectedSaleGroup para que el modal de detalles
    // pueda reabrirse si es necesario.
};

const handleSaveSale = async () => {
    if (!selectedSaleGroup) return;

    saveSaleBtn.disabled = true;
    saveSaleBtn.textContent = 'Guardando...';
    editSaleMessage.classList.add('hidden');

    try {
        const newDate = new Date(editSaleDate.value).toISOString();
        const newPaymentMethod = editPaymentMethod.value;

        const updatePromises = [];
        const itemRows = editSaleItemsContainer.querySelectorAll('[data-sale-id]');

        for (const itemRow of itemRows) {
            const saleId = itemRow.dataset.saleId;
            const newQuantity = parseInt(itemRow.querySelector('.edit-item-quantity').value);
            const newTotalPrice = parseFloat(itemRow.querySelector('.edit-item-price').value);
            
            if (isNaN(newQuantity) || newQuantity < 1 || isNaN(newTotalPrice) || newTotalPrice < 0) {
                throw new Error('Cantidad o Precio inválido para un producto.');
            }

            const newUnitPrice = newTotalPrice / newQuantity;

            const updates = {
                created_at: newDate,
                payment_method: newPaymentMethod,
                quantity: newQuantity,
                total_price: newTotalPrice,
                unit_price: newUnitPrice
            };
            
            // Usar la función de la API para actualizar CADA fila
            updatePromises.push(updateSaleItem(saleId, updates));
        }

        await Promise.all(updatePromises);

        editSaleMessage.textContent = '✅ Venta actualizada con éxito.';
        editSaleMessage.className = 'block p-3 rounded-lg bg-green-100 text-green-700 text-sm';
        editSaleMessage.classList.remove('hidden');

        setTimeout(async () => {
            closeEditModal();
            closeSaleDetails();
            await renderSalesTable();
        }, 1500);

    } catch (error) {
        console.error('Error al guardar la venta:', error);
        editSaleMessage.textContent = `❌ ${error.message || 'Error al guardar la venta.'}`;
        editSaleMessage.className = 'block p-3 rounded-lg bg-red-100 text-red-700 text-sm';
        editSaleMessage.classList.remove('hidden');
    } finally {
        saveSaleBtn.disabled = false;
        saveSaleBtn.textContent = 'Guardar Cambios';
    }
};

// --- ELIMINAR VENTA ---
const deleteSale = async () => {
    if (!selectedSaleGroup) return;
    
    if (!confirm('¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.')) {
        return;
    }
    
    deleteSaleBtn.disabled = true;
    deleteSaleBtn.textContent = 'Eliminando...';
    
    // Eliminar todas las filas de venta del grupo
    // ***** INICIO DE LA CORRECCIÓN *****
    const { error } = await supabase
    // ***** FIN DE LA CORRECCIÓN *****
        .from('sales')
        .delete()
        .in('id', selectedSaleGroup.sale_ids);
    
    if (error) {
        console.error('Error al eliminar venta:', error);
        alert('Error al eliminar la venta');
        deleteSaleBtn.disabled = false;
        deleteSaleBtn.textContent = 'Eliminar Venta';
        return;
    }
    
    // Devolver stock a los productos
    for (const product of selectedSaleGroup.products) {
        const { data: currentProduct, error: getStockError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', product.product_id)
            .single();
        
        if (currentProduct && !getStockError) {
            await supabase
                .from('products')
                .update({ stock: currentProduct.stock + product.quantity })
                .eq('id', product.product_id);
        }
    }
    
    alert('Venta eliminada exitosamente');
    closeSaleDetails();
    await renderSalesTable();
    
    deleteSaleBtn.disabled = false;
    deleteSaleBtn.textContent = 'Eliminar Venta';
};

// --- INICIALIZACIÓN Y EVENTOS ---
const initializeSalesPage = async () => {
    await renderSalesTable();

    // Listeners Modal Detalles
    closeSaleDetailsBtn.addEventListener('click', closeSaleDetails);
    deleteSaleBtn.addEventListener('click', deleteSale);
    editSaleBtn.addEventListener('click', openEditModal);
    saleDetailsModal.addEventListener('click', (e) => {
        if (e.target === saleDetailsModal) closeSaleDetails();
    });

    // Listeners Modal Edición
    closeEditSaleBtn.addEventListener('click', closeEditModal);
    cancelEditSaleBtn.addEventListener('click', closeEditModal);
    saveSaleBtn.addEventListener('click', handleSaveSale);
    editSaleModal.addEventListener('click', (e) => {
        if (e.target === editSaleModal) closeEditModal();
    });
};

initializeSalesPage();
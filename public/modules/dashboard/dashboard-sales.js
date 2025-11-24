// public/modules/dashboard/dashboard-sales.js

import { supabase } from '../../core/supabase.js';
import { getSales, updateSaleItem } from './dashboard.api.js';

console.log("✅ dashboard-sales.js cargado (Versión con Notas)");

// --- ELEMENTOS DEL DOM ---
const salesTableBody = document.querySelector('#sales-table-body');
const salesSearchInput = document.querySelector('#sales-search-input');
const salesDateFilter = document.querySelector('#sales-date-filter');
const clearSalesFiltersBtn = document.querySelector('#clear-sales-filters');
const paginationContainer = document.querySelector('#pagination-container');

// Modal de detalles
const saleDetailsModal = document.querySelector('#sale-details-modal');
const closeSaleDetailsBtn = document.querySelector('#close-sale-details-btn');
const saleDetailsContent = document.querySelector('#sale-details-content');
const deleteSaleBtn = document.querySelector('#delete-sale-btn');
const editSaleBtn = document.querySelector('#edit-sale-btn');

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
let allSalesGrouped = [];
let filteredSales = [];
let selectedSaleGroup = null;

// Variables de paginación
let currentPage = 1;
const itemsPerPage = 10;

// --- LÓGICA DE AGRUPACIÓN ---
const groupSalesData = (salesRaw) => {
    const groupedDataMap = new Map();
    
    salesRaw.forEach(sale => {
        try {
             // Asegurar que created_at existe para evitar errores de fecha
            const createdVal = sale.created_at || new Date().toISOString();
            const saleDate = new Date(createdVal);
            
            const dateKey = saleDate.toISOString().split('T')[0];
            // Usamos substring de forma segura
            const timeStr = saleDate.toTimeString().split(' ')[0] || '00:00:00';
            const timeKey = timeStr.substring(0, 5);
             
            // Normalizamos el método de pago a MAYÚSCULAS
            const paymentMethod = (sale.payment_method || 'DESCONOCIDO').toUpperCase();
            
            const key = `${dateKey}-${timeKey}-${sale.client_id}-${paymentMethod}`;
            
            if (!groupedDataMap.has(key)) {
                groupedDataMap.set(key, {
                    key: key,
                    created_at: createdVal,
                    client: sale.client,
                    client_id: sale.client_id,
                    payment_method: paymentMethod,
                    products: [],
                    total: 0,
                    sale_ids: []
                });
            }
            
            const group = groupedDataMap.get(key);
            
            // AQUI SE AGREGA LA NOTA AL PRODUCTO AGRUPADO
            group.products.push({
                id: sale.id,
                name: sale.product?.name || 'Producto Eliminado',
                quantity: sale.quantity,
                unit_price: sale.unit_price,
                price: sale.total_price,
                product_id: sale.product_id,
                note: sale.notes || '' // <--- CAMPO NOTA AGREGADO
            });
            
            group.sale_ids.push(sale.id);
            group.total += (sale.total_price || 0);
        } catch (err) {
            console.warn("Error al agrupar una venta:", sale, err);
        }
    });
    
    return Array.from(groupedDataMap.values()).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
};

// --- CARGA INICIAL DE DATOS ---
const loadSalesData = async () => {
    try {
        if (salesTableBody) {
             salesTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">Cargando ventas...</td></tr>`;
        }
        
        console.log("Iniciando carga de ventas...");
        // getSales trae todas las columnas (*), así que traerá 'notes' automáticamente
        const rawSales = await getSales();
        console.log(`Ventas cargadas: ${rawSales ? rawSales.length : 0}`);

        if (!rawSales || rawSales.length === 0) {
            allSalesGrouped = [];
            filteredSales = [];
            renderCurrentPage();
            return;
        }
        
        allSalesGrouped = groupSalesData(rawSales);
        console.log(`Grupos de ventas creados: ${allSalesGrouped.length}`);
        applyFilters();

    } catch (error) {
        console.error("❌ Error fatal al cargar ventas:", error);
        if (salesTableBody) {
            salesTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 font-medium">Error al cargar los datos. Por favor, recarga la página.</td></tr>`;
        }
    }
};

// --- FILTRADO ---
const applyFilters = () => {
    const searchTerm = salesSearchInput ? salesSearchInput.value.toLowerCase().trim() : '';
    const filterDate = salesDateFilter ? salesDateFilter.value : '';

    filteredSales = allSalesGrouped.filter(sale => {
        let matchesSearch = true;
        if (searchTerm) {
            const clientName = (sale.client?.first_name && sale.client?.last_name) 
                ? `${sale.client.first_name} ${sale.client.last_name}`.toLowerCase() 
                : (sale.client?.full_name || '').toLowerCase();
            
            // Buscamos también en el nombre del producto y en las NOTAS
            const productsString = sale.products.map(p => `${p.name} ${p.note || ''}`).join(' ').toLowerCase();
            
            matchesSearch = clientName.includes(searchTerm) || productsString.includes(searchTerm);
        }

        let matchesDate = true;
        if (filterDate) {
            const saleDateStr = new Date(sale.created_at).toISOString().split('T')[0];
            matchesDate = saleDateStr === filterDate;
        }

        return matchesSearch && matchesDate;
    });

    currentPage = 1;
    renderCurrentPage();
};

const clearFilters = () => {
    if (salesSearchInput) salesSearchInput.value = '';
    if (salesDateFilter) salesDateFilter.value = '';
    applyFilters();
};

// --- PAGINACIÓN Y RENDERIZADO ---
const renderPaginationControls = () => {
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center gap-2">';
    
    if (currentPage > 1) {
        paginationHTML += `<button class="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 text-sm transition-colors page-btn bg-white" data-page="${currentPage - 1}">Anterior</button>`;
    }

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="px-3 py-1 border rounded-md text-sm font-medium transition-colors page-btn ${i === currentPage ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 text-sm transition-colors page-btn bg-white" data-page="${currentPage + 1}">Siguiente</button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            renderCurrentPage();
        });
    });
};

const renderCurrentPage = () => {
    if (!salesTableBody) return;

    if (filteredSales.length === 0) {
        salesTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No se encontraron ventas con los filtros actuales.</td></tr>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const salesToShow = filteredSales.slice(startIndex, endIndex);

    salesTableBody.innerHTML = salesToShow.map(sale => {
        const clientName = (sale.client?.first_name && sale.client?.last_name) 
            ? `${sale.client.first_name} ${sale.client.last_name}` 
            : sale.client?.full_name || 'Cliente Eliminado';
        
        // Mostramos un resumen de productos (sin las notas aquí para no saturar la tabla)
        const productsList = sale.products.map(p => `${p.name} (x${p.quantity})`).join(', ');
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer transition-colors" data-sale-key="${sale.key}">
                <td class="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                    <div>${new Date(sale.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                    <div class="text-xs text-gray-500">${new Date(sale.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td class="px-6 py-4 text-sm font-medium text-gray-900">${clientName}</td>
                <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title="${productsList}">${productsList}</td>
                <td class="px-6 py-4 text-sm font-bold text-green-600 whitespace-nowrap">S/ ${sale.total.toFixed(2)}</td>
                <td class="px-6 py-4 text-sm text-gray-600 uppercase">${sale.payment_method}</td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <button class="text-blue-600 hover:text-blue-800 font-semibold text-sm py-1 px-3 hover:bg-blue-50 rounded transition-colors view-details-btn">
                        Ver Detalles
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    const newRows = salesTableBody.querySelectorAll('tr[data-sale-key]');
    newRows.forEach(row => {
        row.addEventListener('click', (e) => {
             const saleKey = row.dataset.saleKey;
             const sale = filteredSales.find(s => s.key === saleKey);
             if (sale) openSaleDetails(sale);
        });
    });

    renderPaginationControls();
};

// --- MODAL DE DETALLES ---
const openSaleDetails = (sale) => {
    selectedSaleGroup = sale;
    const clientName = (sale.client?.first_name && sale.client?.last_name) 
        ? `${sale.client.first_name} ${sale.client.last_name}` 
        : sale.client?.full_name || 'Cliente Eliminado';
    
    // AQUI RENDERIZAMOS LAS NOTAS EN EL MODAL
    const productsHTML = sale.products.map(p => `
        <div class="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
            <div class="flex-1 pr-4">
                <p class="font-medium text-gray-800">${p.name}</p>
                
                ${p.note ? `<p class="text-xs text-blue-600 italic mt-0.5 font-medium">Nota: ${p.note}</p>` : ''}
                
                <p class="text-xs text-gray-500 mt-0.5">Cantidad: ${p.quantity} × S/ ${p.unit_price.toFixed(2)}</p>
            </div>
            <p class="font-bold text-gray-900 whitespace-nowrap">S/ ${p.price.toFixed(2)}</p>
        </div>
    `).join('');
    
    saleDetailsContent.innerHTML = `
        <div class="space-y-6">
            <div class="bg-green-50 p-4 rounded-xl border border-green-100">
                <h4 class="text-xs font-bold text-green-800 uppercase tracking-wider mb-3">Resumen de Venta</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p class="text-gray-500 mb-1">Fecha</p>
                        <p class="font-semibold text-gray-900">${new Date(sale.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 mb-1">Hora</p>
                        <p class="font-semibold text-gray-900">${new Date(sale.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 mb-1">Cliente</p>
                        <p class="font-semibold text-gray-900">${clientName}</p>
                    </div>
                     <div>
                        <p class="text-gray-500 mb-1">Método de Pago</p>
                        <p class="font-semibold text-gray-900 uppercase">${sale.payment_method}</p>
                        </div>
                </div>
            </div>
            
            <div>
                <h4 class="text-base font-bold text-gray-800 mb-3">Productos</h4>
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-64 overflow-y-auto custom-scrollbar">
                    ${productsHTML}
                </div>
                <div class="flex justify-between items-center pt-4 mt-2">
                    <p class="text-lg font-bold text-gray-800">Total Pagado:</p>
                    <p class="text-3xl font-bold text-green-600">S/ ${sale.total.toFixed(2)}</p>
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

    const saleDate = new Date(selectedSaleGroup.created_at);
    const tzOffset = saleDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(saleDate - tzOffset)).toISOString().slice(0, 16);
    
    editSaleDate.value = localISOTime;
    editPaymentMethod.value = (selectedSaleGroup.payment_method || 'DESCONOCIDO').toUpperCase();
    editSaleMessage.classList.add('hidden');

    // En la edición, permitimos ver la nota pero no editarla (para simplificar)
    // O podríamos agregar un input si fuera crítico editar la nota histórica.
    // Por ahora, solo mostramos la nota informativa.
    editSaleItemsContainer.innerHTML = selectedSaleGroup.products.map(p => `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50 items-center" data-sale-id="${p.id}">
            <div class="sm:col-span-3">
                <p class="font-semibold text-gray-800 text-sm">${p.name}</p>
                ${p.note ? `<p class="text-xs text-blue-600 italic">Nota: ${p.note}</p>` : ''}
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                <input type="number" value="${p.quantity}" min="1" step="1" 
                       class="edit-item-quantity w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-500 mb-1">Total Producto (S/)</label>
                <input type="number" value="${p.price.toFixed(2)}" min="0" step="0.10" 
                       class="edit-item-price w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
            </div>
        </div>
    `).join('');
    
    saleDetailsModal.classList.add('hidden');
    editSaleModal.classList.remove('hidden');
};

const closeEditModal = () => {
    editSaleModal.classList.add('hidden');
};

const handleSaveSale = async () => {
    if (!selectedSaleGroup) return;

    saveSaleBtn.disabled = true;
    saveSaleBtn.textContent = 'Guardando...';
    editSaleMessage.classList.add('hidden');

    try {
        const newDateVal = editSaleDate.value;
        const newPaymentMethod = editPaymentMethod.value;
        
        if (!newDateVal || !newPaymentMethod) {
             throw new Error("Por favor completa la fecha y el método de pago.");
        }

        const newDateISO = new Date(newDateVal).toISOString();
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
                created_at: newDateISO,
                payment_method: newPaymentMethod,
                quantity: newQuantity,
                total_price: newTotalPrice,
                unit_price: newUnitPrice
            };
            updatePromises.push(updateSaleItem(saleId, updates));
        }

        await Promise.all(updatePromises);

        editSaleMessage.textContent = '✅ Venta actualizada con éxito.';
        editSaleMessage.className = 'block p-3 rounded-lg bg-green-100 text-green-700 text-sm';
        editSaleMessage.classList.remove('hidden');

        setTimeout(async () => {
            closeEditModal();
            closeSaleDetails();
            await loadSalesData();
        }, 1500);

    } catch (error) {
        console.error('Error al guardar la venta:', error);
        editSaleMessage.textContent = `❌ ${error.message || 'Error al guardar.'}`;
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
    
    if (!confirm('¿Estás seguro de eliminar esta venta? El stock de los productos será devuelto.')) {
        return;
    }
    
    deleteSaleBtn.disabled = true;
    deleteSaleBtn.textContent = 'Eliminando...';
    
    try {
        const { error: deleteError } = await supabase
            .from('sales')
            .delete()
            .in('id', selectedSaleGroup.sale_ids);
        
        if (deleteError) throw deleteError;
        
        for (const product of selectedSaleGroup.products) {
            const { data: currentProd } = await supabase
                .from('products')
                .select('stock')
                .eq('id', product.product_id)
                .single();

            if (currentProd) {
                 await supabase
                    .from('products')
                    .update({ stock: currentProd.stock + product.quantity })
                    .eq('id', product.product_id);
            }
        }
        
        alert('Venta eliminada exitosamente.');
        closeSaleDetails();
        await loadSalesData();

    } catch (error) {
        console.error('Error al eliminar venta:', error);
        alert('Error al eliminar la venta: ' + error.message);
    } finally {
        deleteSaleBtn.disabled = false;
        deleteSaleBtn.textContent = 'Eliminar Venta';
    }
};

// --- INICIALIZACIÓN ---
const initializeSalesPage = async () => {
    console.log("Inicializando página de ventas...");
    await loadSalesData();

    salesSearchInput?.addEventListener('input', () => {
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(applyFilters, 300);
    });
    salesDateFilter?.addEventListener('change', applyFilters);
    clearSalesFiltersBtn?.addEventListener('click', clearFilters);

    closeSaleDetailsBtn?.addEventListener('click', closeSaleDetails);
    deleteSaleBtn?.addEventListener('click', deleteSale);
    editSaleBtn?.addEventListener('click', openEditModal);
    saleDetailsModal?.addEventListener('click', (e) => {
        if (e.target === saleDetailsModal) closeSaleDetails();
    });

    closeEditSaleBtn?.addEventListener('click', closeEditModal);
    cancelEditSaleBtn?.addEventListener('click', closeEditModal);
    saveSaleBtn?.addEventListener('click', handleSaveSale);
    editSaleModal?.addEventListener('click', (e) => {
        if (e.target === editSaleModal) closeEditModal();
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSalesPage);
} else {
    initializeSalesPage();
}
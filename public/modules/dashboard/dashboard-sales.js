// public/modules/dashboard/dashboard-sales.js

import { supabase } from '../../core/supabase.js';
import { getSales, addSale, getClients, getProducts } from './dashboard.api.js';

// --- ELEMENTOS DEL DOM ---
const salesTableBody = document.querySelector('#sales-table-body');
const addSaleButton = document.querySelector('#add-sale-button');
const saleModal = document.querySelector('#sale-modal');
const closeSaleModalButton = document.querySelector('#close-sale-modal-button');
const saleForm = document.querySelector('#sale-form');
const saleFormMessage = document.querySelector('#sale-form-message');

// Modal de detalles
const saleDetailsModal = document.querySelector('#sale-details-modal');
const closeSaleDetailsBtn = document.querySelector('#close-sale-details-btn');
const saleDetailsContent = document.querySelector('#sale-details-content');
const deleteSaleBtn = document.querySelector('#delete-sale-btn');

// --- CAMPOS DEL FORMULARIO ---
const clientSearchInput = document.querySelector('#sale-client-search');
const clientSearchIdInput = document.querySelector('#sale-client-id');
const clientSearchResults = document.querySelector('#sale-client-results');

const productSelect = document.querySelector('#sale-product');
const quantityInput = document.querySelector('#sale-quantity');
const priceInput = document.querySelector('#sale-price');

let allProducts = [];
let allClients = [];
let allSales = [];
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
    const groupedSales = new Map();
    
    allSales.forEach(sale => {
        const saleDate = new Date(sale.created_at);
        const dateKey = saleDate.toISOString().split('T')[0];
        const timeKey = saleDate.toTimeString().split(' ')[0].substring(0, 5);
        const key = `${dateKey}-${timeKey}-${sale.client_id}-${sale.payment_method}`;
        
        if (!groupedSales.has(key)) {
            groupedSales.set(key, {
                key: key,
                created_at: sale.created_at,
                client: sale.client,
                client_id: sale.client_id,
                payment_method: sale.payment_method,
                products: [],
                total: 0,
                sale_ids: []
            });
        }
        
        const group = groupedSales.get(key);
        group.products.push({
            id: sale.id,
            name: sale.product?.name || 'Producto Eliminado',
            quantity: sale.quantity,
            unit_price: sale.unit_price,
            price: sale.total_price,
            product_id: sale.product_id
        });
        group.sale_ids.push(sale.id);
        group.total += sale.total_price;
    });
    
    const salesArray = Array.from(groupedSales.values()).sort((a, b) => 
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

const deleteSale = async () => {
    if (!selectedSaleGroup) return;
    
    if (!confirm('¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.')) {
        return;
    }
    
    deleteSaleBtn.disabled = true;
    deleteSaleBtn.textContent = 'Eliminando...';
    
    // Eliminar todas las filas de venta del grupo
    const { error } = await supabase
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
        const { data: currentProduct } = await supabase
            .from('products')
            .select('stock')
            .eq('id', product.product_id)
            .single();
        
        if (currentProduct) {
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

// --- LÓGICA DEL MODAL DE AGREGAR ---
const openModal = async () => {
    saleForm.reset();
    saleFormMessage.classList.add('hidden');
    
    clientSearchInput.placeholder = 'Cargando clientes...';
    allClients = await getClients();
    clientSearchInput.placeholder = 'Escribe para buscar un cliente...';

    productSelect.innerHTML = '<option value="">Cargando productos...</option>';
    allProducts = await getProducts();
    productSelect.innerHTML = '<option value="" disabled selected>Selecciona un producto</option>';
    allProducts.forEach(product => {
        if (product.stock > 0) {
            productSelect.innerHTML += `<option value="${product.id}">${product.name} (Stock: ${product.stock})</option>`;
        }
    });

    priceInput.value = '';
    saleModal.classList.remove('hidden');
};

const closeModal = () => {
    saleModal.classList.add('hidden');
};

const updatePrice = () => {
    const selectedProductId = productSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    const selectedProduct = allProducts.find(p => p.id === selectedProductId);

    if (selectedProduct) {
        const totalPrice = selectedProduct.price * quantity;
        priceInput.value = totalPrice.toFixed(2);
    } else {
        priceInput.value = '';
    }
};

const renderClientResults = (clients) => {
    if (clients.length === 0) {
        clientSearchResults.innerHTML = `<div class="p-3 text-sm text-gray-500">No se encontraron clientes.</div>`;
    } else {
        clientSearchResults.innerHTML = clients.map(client => {
            const displayName = (client.first_name && client.last_name) ? `${client.first_name} ${client.last_name}` : client.full_name;
            return `<div class="p-3 hover:bg-gray-100 cursor-pointer text-sm" data-client-id="${client.id}" data-client-name="${displayName}">${displayName}</div>`;
        }).join('');
    }
    clientSearchResults.classList.remove('hidden');
};

const setupClientSearch = () => {
    clientSearchInput.addEventListener('input', () => {
        const searchTerm = clientSearchInput.value.toLowerCase();
        clientSearchIdInput.value = '';

        if (searchTerm.length < 2) {
            clientSearchResults.classList.add('hidden');
            return;
        }

        const matchedClients = allClients.filter(client => {
            const fullName = ((client.first_name || '') + ' ' + (client.last_name || '')).toLowerCase();
            return fullName.includes(searchTerm);
        });

        renderClientResults(matchedClients);
    });

    clientSearchResults.addEventListener('click', (e) => {
        const clientDiv = e.target.closest('[data-client-id]');
        if (clientDiv) {
            clientSearchInput.value = clientDiv.dataset.clientName;
            clientSearchIdInput.value = clientDiv.dataset.clientId;
            clientSearchResults.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!clientSearchInput.contains(e.target) && !clientSearchResults.contains(e.target)) {
            clientSearchResults.classList.add('hidden');
        }
    });
};

// --- INICIALIZACIÓN Y EVENTOS ---
const initializeSalesPage = async () => {
    await renderSalesTable();

    addSaleButton.addEventListener('click', openModal);
    closeSaleModalButton.addEventListener('click', closeModal);
    saleModal.addEventListener('click', (e) => {
        if (e.target === saleModal) closeModal();
    });

    closeSaleDetailsBtn.addEventListener('click', closeSaleDetails);
    deleteSaleBtn.addEventListener('click', deleteSale);
    saleDetailsModal.addEventListener('click', (e) => {
        if (e.target === saleDetailsModal) closeSaleDetails();
    });

    productSelect.addEventListener('change', updatePrice);
    quantityInput.addEventListener('input', updatePrice);
    
    setupClientSearch();

    saleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = saleForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        saleFormMessage.classList.add('hidden');

        const formData = new FormData(saleForm);
        const selectedProductId = formData.get('product_id');
        const selectedProduct = allProducts.find(p => p.id === selectedProductId);
        const quantity = parseInt(formData.get('quantity'));

        if (!formData.get('client_id') || !selectedProductId || !formData.get('payment_method') || quantity < 1) {
            saleFormMessage.className = 'p-3 rounded-md bg-red-100 text-red-700 text-sm';
            saleFormMessage.textContent = 'Error: Por favor, complete todos los campos requeridos.';
            saleFormMessage.classList.remove('hidden');
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Venta';
            return;
        }

        if (quantity > selectedProduct.stock) {
            alert(`Error: El stock disponible para "${selectedProduct.name}" es de ${selectedProduct.stock} unidades.`);
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Venta';
            return;
        }

        const saleData = {
            client_id: formData.get('client_id'),
            product_id: selectedProductId,
            quantity: quantity,
            unit_price: selectedProduct.price,
            total_price: selectedProduct.price * quantity,
            payment_method: formData.get('payment_method')
        };
        
        const { success, error, warning } = await addSale(saleData);

        if (success) {
            saleFormMessage.className = 'p-3 rounded-md bg-green-100 text-green-700 text-sm';
            saleFormMessage.textContent = '¡Venta registrada con éxito!';
            if (warning) {
                saleFormMessage.textContent += ` (${warning})`;
            }
            saleFormMessage.classList.remove('hidden');
            
            await renderSalesTable();
            setTimeout(closeModal, 1500);

        } else {
            saleFormMessage.className = 'p-3 rounded-md bg-red-100 text-red-700 text-sm';
            saleFormMessage.textContent = `Error: ${error.message}`;
            saleFormMessage.classList.remove('hidden');
        }

        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Venta';
    });
};

initializeSalesPage();
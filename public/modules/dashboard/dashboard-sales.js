import { getSales, addSale, getClients, getProducts } from './dashboard.api.js';

// --- ELEMENTOS DEL DOM ---
const salesTableBody = document.querySelector('#sales-table-body');
const addSaleButton = document.querySelector('#add-sale-button');
const saleModal = document.querySelector('#sale-modal');
const closeSaleModalButton = document.querySelector('#close-sale-modal-button');
const saleForm = document.querySelector('#sale-form');
const saleFormMessage = document.querySelector('#sale-form-message');

// --- CAMPOS DEL FORMULARIO ---
const clientSelect = document.querySelector('#sale-client');
const productSelect = document.querySelector('#sale-product');
const quantityInput = document.querySelector('#sale-quantity');
const priceInput = document.querySelector('#sale-price');

let allProducts = []; // Caché para guardar los productos y sus precios

// --- RENDERIZADO DE LA TABLA ---
const renderSalesTable = async () => {
    salesTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">Cargando...</td></tr>`;
    const sales = await getSales();
    if (sales.length > 0) {
        salesTableBody.innerHTML = sales.map(sale => {
            const clientName = (sale.client?.first_name && sale.client?.last_name) 
                ? `${sale.client.first_name} ${sale.client.last_name}` 
                : sale.client?.full_name || 'Cliente Eliminado';
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 text-sm text-gray-700">${new Date(sale.created_at).toLocaleDateString('es-ES')}</td>
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${clientName}</td>
                    <td class="px-6 py-4 text-sm text-gray-800">${sale.product?.name || 'Producto Eliminado'}</td>
                    <td class="px-6 py-4 text-sm font-bold text-green-600">S/ ${sale.total_price.toFixed(2)}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${sale.payment_method}</td>
                </tr>
            `;
        }).join('');
    } else {
        salesTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay ventas registradas.</td></tr>`;
    }
};

// --- LÓGICA DEL MODAL ---
const openModal = async () => {
    saleForm.reset();
    saleFormMessage.classList.add('hidden');
    
    // Cargar clientes
    clientSelect.innerHTML = '<option value="">Cargando clientes...</option>';
    const clients = await getClients();
    clientSelect.innerHTML = '<option value="" disabled selected>Selecciona un cliente</option>';
    clients.forEach(client => {
        const displayName = (client.first_name && client.last_name) ? `${client.first_name} ${client.last_name}` : client.full_name;
        clientSelect.innerHTML += `<option value="${client.id}">${displayName}</option>`;
    });

    // Cargar productos
    productSelect.innerHTML = '<option value="">Cargando productos...</option>';
    allProducts = await getProducts(); // Guardar en caché
    productSelect.innerHTML = '<option value="" disabled selected>Selecciona un producto</option>';
    allProducts.forEach(product => {
        if (product.stock > 0) { // Solo mostrar productos con stock
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

// --- INICIALIZACIÓN Y EVENTOS ---
const initializeSalesPage = async () => {
    await renderSalesTable();

    addSaleButton.addEventListener('click', openModal);
    closeSaleModalButton.addEventListener('click', closeModal);
    saleModal.addEventListener('click', (e) => {
        if (e.target === saleModal) closeModal();
    });

    productSelect.addEventListener('change', updatePrice);
    quantityInput.addEventListener('input', updatePrice);

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
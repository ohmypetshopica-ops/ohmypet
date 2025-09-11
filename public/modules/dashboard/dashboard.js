// public/modules/dashboard/dashboard.js

import { supabase } from '../../core/supabase.js';
import { getClientCount, getPetCount, getProducts, getServices, getAppointments, addProduct } from './dashboard.api.js';
import { createProductRow, createServiceRow, createAppointmentRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const productsTableBody = document.querySelector('#products-table-body');
const servicesTableBody = document.querySelector('#services-table-body');
const appointmentsTableBody = document.querySelector('#appointments-table-body');
const logoutButton = document.querySelector('#logout-button');
const addProductButton = document.querySelector('#add-product-button');
const addProductModal = document.querySelector('#add-product-modal');
const closeProductModalButton = document.querySelector('#close-product-modal-button');
const addProductForm = document.querySelector('#add-product-form');

// --- CARGA DE DATOS PRINCIPAL ---
const loadDashboardData = async () => {
    const [clientCount, petCount, products, services, appointments] = await Promise.all([
        getClientCount(), getPetCount(), getProducts(), getServices(), getAppointments()
    ]);

    clientCountElement.textContent = clientCount;
    petCountElement.textContent = petCount;

    productsTableBody.innerHTML = products.length > 0
        ? products.map(createProductRow).join('')
        : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay productos.</td></tr>`;

    servicesTableBody.innerHTML = services.length > 0
        ? services.map(createServiceRow).join('')
        : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay servicios.</td></tr>`;

    if (appointments && appointments.length > 0) {
        appointments.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        appointmentsTableBody.innerHTML = appointments.map(createAppointmentRow).join('');
    } else {
        appointmentsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay citas.</td></tr>`;
    }
};

// --- LOGOUT ---
logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/public/modules/admin-login/admin-login.html';
});

// --- LÓGICA PARA EL MODAL DE AGREGAR PRODUCTO ---
const openProductModal = () => addProductModal.classList.remove('hidden');
const closeProductModal = () => addProductModal.classList.add('hidden');

const setupProductModalListeners = () => {
    addProductButton.addEventListener('click', openProductModal);
    closeProductModalButton.addEventListener('click', closeProductModal);
    addProductModal.addEventListener('click', (event) => {
        if (event.target === addProductModal) closeProductModal();
    });

    addProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addProductForm);
        const newProduct = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            stock: parseInt(formData.get('stock')),
            image_url: formData.get('image_url')
        };

        const result = await addProduct(newProduct);

        if (result.success) {
            alert('¡Producto agregado con éxito!');
            addProductForm.reset();
            closeProductModal();
            // Recargamos y renderizamos la tabla de productos para ver el cambio
            const updatedProducts = await getProducts();
            productsTableBody.innerHTML = updatedProducts.map(createProductRow).join('');
        } else {
            alert(`Error al agregar el producto: ${result.error.message}`);
        }
    });
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupProductModalListeners();
});
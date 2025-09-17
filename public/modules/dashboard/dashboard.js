// public/modules/dashboard/dashboard.js

import { supabase } from '../../core/supabase.js';
// 1. IMPORTAMOS LA NUEVA FUNCIÓN DE FILTRADO
import {
    getClientCount, getClients, getPetCount, getProducts, getServices, getAppointments, addProduct,
    getAppointmentsCount, getProductsCount, getUpcomingAppointments, searchClients, updateAppointmentStatus,
    filterAppointments
} from './dashboard.api.js';
import {
    createClientRow, createProductRow, createServiceRow, createAppointmentRow, createUpcomingAppointmentItem
} from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const appointmentsCountElement = document.querySelector('#appointments-count');
const productsCountElement = document.querySelector('#products-count');
const upcomingAppointmentsList = document.querySelector('#upcoming-appointments-list');
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input');
const productsTableBody = document.querySelector('#products-table-body');
const servicesTableBody = document.querySelector('#services-table-body');
const appointmentsTableBody = document.querySelector('#appointments-table-body');

// 2. AÑADIMOS SELECTORES PARA LOS FILTROS
const appointmentStatusFilter = document.querySelector('#appointment-status-filter');
const appointmentDateFilter = document.querySelector('#appointment-date-filter');
const clearFiltersButton = document.querySelector('#clear-filters-button');

const logoutButton = document.querySelector('#logout-button');
const addProductButton = document.querySelector('#add-product-button');
const addProductModal = document.querySelector('#add-product-modal');
const closeProductModalButton = document.querySelector('#close-product-modal-button');
const addProductForm = document.querySelector('#add-product-form');


// --- RENDERIZADO DE DATOS ---
const renderAppointmentsTable = async () => {
    const appointments = await getAppointments();
    appointmentsTableBody.innerHTML = appointments.length > 0
        ? appointments.map(createAppointmentRow).join('')
        : `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay citas registradas.</td></tr>`;
};

const loadDashboardData = async () => {
    // ... (El resto de la carga de datos no cambia)
    const [
        clientCount, petCount, appointmentsCount, productsCount, upcomingAppointments,
        clients, products, services, appointments
    ] = await Promise.all([
        getClientCount(), getPetCount(), getAppointmentsCount(), getProductsCount(),
        getUpcomingAppointments(), getClients(), getProducts(), getServices(), getAppointments()
    ]);
    clientCountElement.textContent = clientCount;
    petCountElement.textContent = petCount;
    appointmentsCountElement.textContent = appointmentsCount;
    productsCountElement.textContent = productsCount;
    upcomingAppointmentsList.innerHTML = upcomingAppointments.length > 0 ? upcomingAppointments.map(createUpcomingAppointmentItem).join('') : `<p class="text-sm text-gray-500 text-center py-4">No hay citas programadas.</p>`;
    clientsTableBody.innerHTML = clients.length > 0 ? clients.map(createClientRow).join('') : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
    productsTableBody.innerHTML = products.length > 0 ? products.map(createProductRow).join('') : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay productos.</td></tr>`;
    servicesTableBody.innerHTML = services.length > 0 ? services.map(createServiceRow).join('') : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay servicios.</td></tr>`;
    appointmentsTableBody.innerHTML = appointments.length > 0 ? appointments.map(createAppointmentRow).join('') : `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay citas registradas.</td></tr>`;
};


// --- MANEJO DE ACCIONES Y FILTROS ---

const setupAppointmentActions = () => {
    appointmentsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const row = button.closest('tr[data-appointment-id]');
        const appointmentId = row.dataset.appointmentId;
        let newStatus = '';
        if (action === 'confirmar') newStatus = 'confirmada';
        else if (action === 'rechazar') newStatus = 'rechazada';
        else if (action === 'completar') newStatus = 'completada';
        else return;
        const result = await updateAppointmentStatus(appointmentId, newStatus);
        if (result.success) {
            await applyAppointmentFilters(); // Usamos la función de filtros para refrescar
            const newAppointmentsCount = await getAppointmentsCount();
            appointmentsCountElement.textContent = newAppointmentsCount;
        } else {
            alert('Error al actualizar el estado de la cita.');
        }
    });
};

// 3. NUEVA FUNCIÓN PARA APLICAR FILTROS DE CITAS
const applyAppointmentFilters = async () => {
    const filters = {
        status: appointmentStatusFilter.value,
        date: appointmentDateFilter.value
    };
    const appointments = await filterAppointments(filters);
    appointmentsTableBody.innerHTML = appointments.length > 0
        ? appointments.map(createAppointmentRow).join('')
        : `<tr><td colspan="5" class="text-center py-4 text-gray-500">No se encontraron citas con estos filtros.</td></tr>`;
};

const setupAppointmentFilters = () => {
    appointmentStatusFilter.addEventListener('change', applyAppointmentFilters);
    appointmentDateFilter.addEventListener('change', applyAppointmentFilters);
    clearFiltersButton.addEventListener('click', () => {
        appointmentStatusFilter.value = '';
        appointmentDateFilter.value = '';
        applyAppointmentFilters();
    });
};


// --- OTRAS FUNCIONES (Búsqueda, Modal, Navegación, Logout) ---
const setupClientSearch = () => { /* ... (código sin cambios) ... */
    clientSearchInput.addEventListener('input', async (event) => {
        const searchTerm = event.target.value.trim();
        const clients = searchTerm ? await searchClients(searchTerm) : await getClients();
        clientsTableBody.innerHTML = clients.length > 0
            ? clients.map(createClientRow).join('')
            : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No se encontraron clientes.</td></tr>`;
    });
};
const setupProductModalListeners = () => { /* ... (código sin cambios) ... */
    const openProductModal = () => addProductModal.classList.remove('hidden');
    const closeProductModal = () => addProductModal.classList.add('hidden');
    addProductButton.addEventListener('click', openProductModal);
    closeProductModalButton.addEventListener('click', closeProductModal);
    addProductModal.addEventListener('click', (e) => { if (e.target === addProductModal) closeProductModal(); });
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addProductForm);
        const newProduct = { name: formData.get('name'), description: formData.get('description'), price: parseFloat(formData.get('price')), stock: parseInt(formData.get('stock')), image_url: formData.get('image_url') };
        const result = await addProduct(newProduct);
        if (result.success) {
            alert('¡Producto agregado con éxito!');
            addProductForm.reset();
            closeProductModal();
            const updatedProducts = await getProducts();
            productsTableBody.innerHTML = updatedProducts.map(createProductRow).join('');
        } else {
            alert(`Error al agregar el producto: ${result.error.message}`);
        }
    });
};
const setupDashboardNavigation = () => { /* ... (código sin cambios) ... */
    const navLinks = document.querySelectorAll('aside nav a.group-item');
    const contentSections = document.querySelectorAll('main .flex-1 > section');
    const headerTitle = document.querySelector('header h1');
    const sectionTitles = { '#overview': 'Dashboard', '#clients': 'Gestión de Clientes', '#products': 'Gestión de Productos', '#services': 'Gestión de Servicios', '#appointments': 'Gestión de Citas' };
    const showSection = (targetId) => {
        contentSections.forEach(s => s.classList.add('hidden'));
        navLinks.forEach(l => { l.classList.remove('bg-green-100'); l.classList.add('hover:bg-gray-100'); });
        const targetSection = document.querySelector(targetId);
        if (targetSection) targetSection.classList.remove('hidden');
        const activeLink = document.querySelector(`aside nav a[href="${targetId}"]`);
        if (activeLink) { activeLink.classList.add('bg-green-100'); activeLink.classList.remove('hover:bg-gray-100'); }
        if (headerTitle && sectionTitles[targetId]) headerTitle.textContent = sectionTitles[targetId];
    };
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); showSection(link.getAttribute('href')); });
    });
    showSection('#overview');
};
logoutButton.addEventListener('click', async (e) => { e.preventDefault(); await supabase.auth.signOut(); window.location.href = '/public/modules/admin-login/admin-login.html'; });


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupProductModalListeners();
    setupDashboardNavigation();
    setupClientSearch();
    setupAppointmentActions();
    setupAppointmentFilters(); // <-- 4. LLAMAMOS A LA NUEVA FUNCIÓN
});
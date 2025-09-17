// public/modules/dashboard/dashboard.js

import { supabase } from '../../core/supabase.js';
// 1. IMPORTAMOS LA NUEVA FUNCIÓN DE BÚSQUEDA
import {
    getClientCount, getClients, getPetCount, getProducts, getServices, getAppointments, addProduct,
    getAppointmentsCount, getProductsCount, getUpcomingAppointments, searchClients
} from './dashboard.api.js';
import {
    createClientRow, createProductRow, createServiceRow, createAppointmentRow, createUpcomingAppointmentItem
} from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
// Elementos del Resumen
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const appointmentsCountElement = document.querySelector('#appointments-count');
const productsCountElement = document.querySelector('#products-count');

// Listas, Tablas y Búsqueda
const upcomingAppointmentsList = document.querySelector('#upcoming-appointments-list');
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input'); // <-- Selector para la búsqueda
const productsTableBody = document.querySelector('#products-table-body');
const servicesTableBody = document.querySelector('#services-table-body');
const appointmentsTableBody = document.querySelector('#appointments-table-body');

// Botones y Modales
const logoutButton = document.querySelector('#logout-button');
const addProductButton = document.querySelector('#add-product-button');
const addProductModal = document.querySelector('#add-product-modal');
const closeProductModalButton = document.querySelector('#close-product-modal-button');
const addProductForm = document.querySelector('#add-product-form');


// --- CARGA DE DATOS PRINCIPAL ---
const loadDashboardData = async () => {
    const [
        clientCount, petCount, appointmentsCount, productsCount, upcomingAppointments,
        clients, products, services, appointments
    ] = await Promise.all([
        getClientCount(), getPetCount(), getAppointmentsCount(), getProductsCount(),
        getUpcomingAppointments(), getClients(), getProducts(), getServices(), getAppointments()
    ]);

    // Renderizamos Resumen
    clientCountElement.textContent = clientCount;
    petCountElement.textContent = petCount;
    appointmentsCountElement.textContent = appointmentsCount;
    productsCountElement.textContent = productsCount;

    // Renderizamos Próximas Citas
    if (upcomingAppointments.length > 0) {
        upcomingAppointmentsList.innerHTML = upcomingAppointments.map(createUpcomingAppointmentItem).join('');
    } else {
        upcomingAppointmentsList.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">No hay citas programadas.</p>`;
    }

    // Renderizamos Tablas
    clientsTableBody.innerHTML = clients.length > 0
        ? clients.map(createClientRow).join('')
        : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
    productsTableBody.innerHTML = products.length > 0
        ? products.map(createProductRow).join('')
        : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay productos.</td></tr>`;
    servicesTableBody.innerHTML = services.length > 0
        ? services.map(createServiceRow).join('')
        : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay servicios.</td></tr>`;
    appointmentsTableBody.innerHTML = appointments.length > 0
        ? appointments.map(createAppointmentRow).join('')
        : `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay citas.</td></tr>`;
};

// --- 2. LÓGICA DE BÚSQUEDA DE CLIENTES ---
const setupClientSearch = () => {
    clientSearchInput.addEventListener('input', async (event) => {
        const searchTerm = event.target.value.trim();

        // Si la barra está vacía, muestra todos los clientes. Si no, busca.
        const clients = searchTerm
            ? await searchClients(searchTerm)
            : await getClients();

        // Actualiza la tabla con los resultados.
        if (clients.length > 0) {
            clientsTableBody.innerHTML = clients.map(createClientRow).join('');
        } else {
            clientsTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">No se encontraron clientes.</td></tr>`;
        }
    });
};


// --- LOGOUT (Sin cambios) ---
logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/public/modules/admin-login/admin-login.html';
});

// --- LÓGICA DEL MODAL (Sin cambios) ---
const setupProductModalListeners = () => {
    const openProductModal = () => addProductModal.classList.remove('hidden');
    const closeProductModal = () => addProductModal.classList.add('hidden');
    addProductButton.addEventListener('click', openProductModal);
    closeProductModalButton.addEventListener('click', closeProductModal);
    addProductModal.addEventListener('click', (event) => {
        if (event.target === addProductModal) closeProductModal();
    });
    addProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addProductForm);
        const newProduct = {
            name: formData.get('name'), description: formData.get('description'),
            price: parseFloat(formData.get('price')), stock: parseInt(formData.get('stock')),
            image_url: formData.get('image_url')
        };
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

// --- NAVEGACIÓN DEL DASHBOARD (Sin cambios) ---
const setupDashboardNavigation = () => {
    const navLinks = document.querySelectorAll('aside nav a.group-item');
    const contentSections = document.querySelectorAll('main .flex-1 > section');
    const headerTitle = document.querySelector('header h1');
    const sectionTitles = {
        '#overview': 'Dashboard', '#clients': 'Gestión de Clientes',
        '#products': 'Gestión de Productos', '#services': 'Gestión de Servicios',
        '#appointments': 'Gestión de Citas'
    };
    const showSection = (targetId) => {
        contentSections.forEach(section => section.classList.add('hidden'));
        navLinks.forEach(link => {
            link.classList.remove('bg-green-100');
            link.classList.add('hover:bg-gray-100');
        });
        const targetSection = document.querySelector(targetId);
        if (targetSection) targetSection.classList.remove('hidden');
        const activeLink = document.querySelector(`aside nav a[href="${targetId}"]`);
        if (activeLink) {
            activeLink.classList.add('bg-green-100');
            activeLink.classList.remove('hover:bg-gray-100');
        }
        if (headerTitle && sectionTitles[targetId]) {
            headerTitle.textContent = sectionTitles[targetId];
        }
    };
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = link.getAttribute('href');
            showSection(targetId);
        });
    });
    showSection('#overview');
};


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupProductModalListeners();
    setupDashboardNavigation();
    setupClientSearch(); // <-- 3. LLAMAMOS A LA NUEVA FUNCIÓN
});
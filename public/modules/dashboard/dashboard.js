// public/modules/dashboard/dashboard.js

import { supabase } from '../../core/supabase.js';
import {
    getClientCount, getPetCount, getAppointmentsCount, getProductsCount,
    getUpcomingAppointments, getClients, searchClients, getProducts, getServices, getAppointments,
    updateAppointmentStatus, filterAppointments,
    addProduct, updateProduct, deleteProduct,
    addService, updateService, deleteService
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
const appointmentStatusFilter = document.querySelector('#appointment-status-filter');
const appointmentDateFilter = document.querySelector('#appointment-date-filter');
const clearFiltersButton = document.querySelector('#clear-filters-button');
const addProductButton = document.querySelector('#add-product-button');
const productModal = document.querySelector('#product-modal');
const productModalTitle = document.querySelector('#product-modal-title');
const closeProductModalButton = document.querySelector('#close-product-modal-button');
const productForm = document.querySelector('#product-form');
const addServiceButton = document.querySelector('#add-service-button');
const serviceModal = document.querySelector('#service-modal');
const serviceModalTitle = document.querySelector('#service-modal-title');
const closeServiceModalButton = document.querySelector('#close-service-modal-button');
const serviceForm = document.querySelector('#service-form');
const logoutButton = document.querySelector('#logout-button');

// --- RENDERIZADO DE DATOS ---
const renderProductsTable = async () => {
    const products = await getProducts();
    productsTableBody.innerHTML = products.length > 0 ? products.map(createProductRow).join('') : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay productos.</td></tr>`;
};
const renderServicesTable = async () => {
    const services = await getServices();
    servicesTableBody.innerHTML = services.length > 0 ? services.map(createServiceRow).join('') : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay servicios registrados.</td></tr>`;
};
const loadDashboardData = async () => {
    const [clientCount, petCount, appointmentsCount, productsCount, upcomingAppointments, clients, appointments] = await Promise.all([getClientCount(), getPetCount(), getAppointmentsCount(), getProductsCount(), getUpcomingAppointments(), getClients(), getAppointments()]);
    clientCountElement.textContent = clientCount;
    petCountElement.textContent = petCount;
    appointmentsCountElement.textContent = appointmentsCount;
    productsCountElement.textContent = productsCount;
    upcomingAppointmentsList.innerHTML = upcomingAppointments.length > 0 ? upcomingAppointments.map(createUpcomingAppointmentItem).join('') : `<p class="text-sm text-gray-500 text-center py-4">No hay citas programadas.</p>`;
    clientsTableBody.innerHTML = clients.length > 0 ? clients.map(createClientRow).join('') : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
    await renderProductsTable();
    await renderServicesTable();
    appointmentsTableBody.innerHTML = appointments.length > 0 ? appointments.map(createAppointmentRow).join('') : `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay citas registradas.</td></tr>`;
};

// --- FUNCIONES DE MODALES ---
const openProductModalForNew = () => { productModalTitle.textContent = 'Nuevo Producto'; productForm.reset(); productForm.querySelector('#product-id').value = ''; productModal.classList.remove('hidden'); };
const openProductModalForEdit = (product) => {
    productModalTitle.textContent = 'Editar Producto';
    productForm.reset();
    productForm.querySelector('#product-id').value = product.id;
    productForm.querySelector('#product-name').value = product.name;
    productForm.querySelector('#product-description').value = product.description || '';
    productForm.querySelector('#product-price').value = product.price;
    productForm.querySelector('#product-stock').value = product.stock;
    // Guardamos la URL de la imagen actual en un campo oculto
    productForm.querySelector('#product-image-url-hidden').value = product.image_url || '';
    productModal.classList.remove('hidden');
};
const closeProductModal = () => productModal.classList.add('hidden');
const openServiceModalForNew = () => { serviceModalTitle.textContent = 'Nuevo Servicio'; serviceForm.reset(); serviceForm.querySelector('#service-id').value = ''; serviceModal.classList.remove('hidden'); };
const openServiceModalForEdit = (service) => { serviceModalTitle.textContent = 'Editar Servicio'; serviceForm.reset(); serviceForm.querySelector('#service-id').value = service.id; serviceForm.querySelector('#service-name').value = service.name; serviceForm.querySelector('#service-description').value = service.description || ''; serviceForm.querySelector('#service-price').value = service.price; serviceForm.querySelector('#service-duration').value = service.duration_minutes; serviceModal.classList.remove('hidden'); };
const closeServiceModal = () => serviceModal.classList.add('hidden');

// --- MANEJO DE EVENTOS Y ACCIONES ---
const setupAppointmentActions = () => {
    appointmentsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        if (!['confirmar', 'rechazar', 'completar'].includes(action)) return;
        
        const row = button.closest('tr[data-appointment-id]');
        const appointmentId = row.dataset.appointmentId;
        let newStatus = action === 'confirmar' ? 'confirmada' : (action === 'rechazar' ? 'rechazada' : 'completada');
        
        const result = await updateAppointmentStatus(appointmentId, newStatus);
        if (result.success) {
            await applyAppointmentFilters();
            appointmentsCountElement.textContent = await getAppointmentsCount();
        } else {
            alert('Error al actualizar el estado de la cita.');
        }
    });
};
const applyAppointmentFilters = async () => {
    const filters = { status: appointmentStatusFilter.value, date: appointmentDateFilter.value };
    const appointments = await filterAppointments(filters);
    appointmentsTableBody.innerHTML = appointments.length > 0 ? appointments.map(createAppointmentRow).join('') : `<tr><td colspan="5" class="text-center py-4 text-gray-500">No se encontraron citas.</td></tr>`;
};
const setupAppointmentFilters = () => {
    appointmentStatusFilter.addEventListener('change', applyAppointmentFilters);
    appointmentDateFilter.addEventListener('change', applyAppointmentFilters);
    clearFiltersButton.addEventListener('click', () => { appointmentStatusFilter.value = ''; appointmentDateFilter.value = ''; applyAppointmentFilters(); });
};
const setupClientSearch = () => {
    clientSearchInput.addEventListener('input', async (event) => {
        const searchTerm = event.target.value.trim();
        const clients = searchTerm ? await searchClients(searchTerm) : await getClients();
        clientsTableBody.innerHTML = clients.length > 0 ? clients.map(createClientRow).join('') : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No se encontraron clientes.</td></tr>`;
    });
};
const setupProductModal = () => {
    addProductButton.addEventListener('click', openProductModalForNew);
    closeProductModalButton.addEventListener('click', closeProductModal);
    productModal.addEventListener('click', (e) => { if (e.target === productModal) closeProductModal(); });

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = productForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        const formData = new FormData(productForm);
        const productId = formData.get('id');
        const imageFile = formData.get('image_file');
        
        let imageUrl = formData.get('image_url_hidden'); // URL de la imagen existente

        if (imageFile && imageFile.size > 0) {
            // Si se subió un nuevo archivo, lo procesamos
            const fileName = `products/${Date.now()}_${imageFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('product_images') // Nombre de tu bucket
                .upload(fileName, imageFile);

            if (uploadError) {
                alert('Error al subir la imagen: ' + uploadError.message);
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Producto';
                return;
            }

            // Obtenemos la URL pública del archivo recién subido
            const { data } = supabase.storage
                .from('product_images')
                .getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        const productData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            stock: parseInt(formData.get('stock')),
            image_url: imageUrl,
        };

        const result = productId ? await updateProduct(productId, productData) : await addProduct(productData);
        
        if (result.success) {
            alert(`¡Producto ${productId ? 'actualizado' : 'agregado'} con éxito!`);
            closeProductModal();
            await renderProductsTable();
            productsCountElement.textContent = await getProductsCount();
        } else {
            alert(`Error al guardar el producto: ${result.error.message}`);
        }
        
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Producto';
    });
};
const setupServiceModal = () => {
    addServiceButton.addEventListener('click', openServiceModalForNew);
    closeServiceModalButton.addEventListener('click', closeServiceModal);
    serviceModal.addEventListener('click', (e) => { if (e.target === serviceModal) closeServiceModal(); });
    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(serviceForm);
        const serviceId = formData.get('id');
        const serviceData = { name: formData.get('name'), description: formData.get('description'), price: parseFloat(formData.get('price')), duration_minutes: parseInt(formData.get('duration_minutes')) };
        const result = serviceId ? await updateService(serviceId, serviceData) : await addService(serviceData);
        if (result.success) {
            alert(`¡Servicio ${serviceId ? 'actualizado' : 'agregado'} con éxito!`);
            closeServiceModal();
            await renderServicesTable();
        } else {
            alert(`Error al guardar el servicio: ${result.error.message}`);
        }
    });
};
const setupProductActions = () => {
    productsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const row = button.closest('tr[data-product-id]');
        const productId = row.dataset.productId;
        if (action === 'edit') {
            openProductModalForEdit(JSON.parse(button.dataset.product));
        } else if (action === 'delete') {
            if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                const result = await deleteProduct(productId);
                if (result.success) { alert('Producto eliminado.'); await renderProductsTable(); productsCountElement.textContent = await getProductsCount(); } 
                else { alert(`Error al eliminar: ${result.error.message}`); }
            }
        }
    });
};
const setupServiceActions = () => {
    servicesTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const row = button.closest('tr[data-service-id]');
        const serviceId = row.dataset.serviceId;
        if (action === 'edit') {
            openServiceModalForEdit(JSON.parse(button.dataset.service));
        } else if (action === 'delete') {
            if (confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
                const result = await deleteService(serviceId);
                if (result.success) { alert('Servicio eliminado.'); await renderServicesTable(); } 
                else { alert(`Error al eliminar: ${result.error.message}`); }
            }
        }
    });
};
const setupDashboardNavigation = () => {
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
    navLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); showSection(link.getAttribute('href')); }); });
    showSection('#overview');
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupProductModal();
    setupServiceModal();
    setupProductActions();
    setupServiceActions();
    setupDashboardNavigation();
    setupClientSearch();
    setupAppointmentActions();
    setupAppointmentFilters();
    logoutButton.addEventListener('click', async (e) => { e.preventDefault(); await supabase.auth.signOut(); window.location.href = '/public/modules/admin-login/admin-login.html'; });
});
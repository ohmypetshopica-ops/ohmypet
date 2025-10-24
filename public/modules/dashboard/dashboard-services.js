import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const servicesTableBody = document.querySelector('#services-table-body');
const serviceSearchInput = document.querySelector('#service-search-input');
const serviceDateFilter = document.querySelector('#service-date-filter');
const clearFiltersBtn = document.querySelector('#clear-filters-btn');
const totalServicesCount = document.querySelector('#total-services-count');
const completedServicesCount = document.querySelector('#completed-services-count');
const monthServicesCount = document.querySelector('#month-services-count');
const paginationContainer = document.querySelector('#pagination-container');
const headerTitle = document.querySelector('#header-title');

// --- INICIO: NUEVOS ELEMENTOS DEL MODAL Y EDICIÓN ---
const serviceDetailsModal = document.querySelector('#service-details-modal');
const modalServiceDetailsView = document.querySelector('#modal-service-details-view');
const modalServiceEditForm = document.querySelector('#modal-service-edit-form');
const closeServiceModal = document.querySelector('#close-service-modal');
const editServiceBtn = document.querySelector('#edit-service-btn');
const saveServiceBtn = document.querySelector('#save-service-btn');
const cancelEditBtn = document.querySelector('#cancel-edit-btn');
// --- FIN: NUEVOS ELEMENTOS ---

// --- VARIABLES DE PAGINACIÓN Y ESTADO ---
let currentPage = 1;
const itemsPerPage = 10;
let totalServices = 0;
let currentFilters = { search: '', date: '', petId: '', petName: '' };
let allCompletedServices = [];
let selectedService = null; // Para guardar el servicio actual en el modal

const urlParams = new URLSearchParams(window.location.search);
const petIdFromUrl = urlParams.get('pet');
const petNameFromUrl = urlParams.get('name');

// --- FUNCIONES DE API ---
const getCompletedServices = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, service_price, payment_method,
            final_observations, final_weight, pet_id,
            pets (id, name),
            profiles (id, full_name, first_name, last_name),
            appointment_photos (id, photo_type, image_url)
        `)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

    if (error) {
        console.error('Error al obtener servicios completados:', error);
        return [];
    }
    return data || [];
};

const getServicesStats = async () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [totalRes, completedRes, monthRes] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'completada'),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
            .eq('status', 'completada')
            .gte('appointment_date', firstDayOfMonth)
            .lte('appointment_date', lastDayOfMonth)
    ]);

    return {
        total: totalRes.count || 0,
        completed: completedRes.count || 0,
        month: monthRes.count || 0
    };
};

// --- RENDERIZADO DE TABLA ---
const createServiceRow = (service) => {
    const ownerProfile = service.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin cliente';

    const petName = service.pets?.name || 'Sin mascota';
    const paymentMethod = service.payment_method || 'N/A';
    const cost = service.service_price ? `S/ ${service.service_price.toFixed(2)}` : 'N/A';

    return `
        <tr class="hover:bg-gray-50 transition-colors" data-service-id="${service.id}">
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">${ownerName}</div>
                <div class="text-sm text-gray-500">${petName}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                <div class="text-sm text-gray-500">${service.appointment_time}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700">${service.service || 'Servicio general'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700">${paymentMethod}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm font-semibold text-gray-900">${cost}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <button class="text-blue-600 hover:text-blue-900 font-semibold view-service-btn">
                    Ver Detalles
                </button>
            </td>
        </tr>
    `;
};

const renderServicesTable = (services) => {
    if (!servicesTableBody) return;
    
    if (services.length > 0) {
        servicesTableBody.innerHTML = services.map(createServiceRow).join('');
        attachServiceRowListeners();
    } else {
        servicesTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No se encontraron servicios completados.</td></tr>';
    }
};

// --- PAGINACIÓN ---
const renderPagination = (filteredServices) => {
    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
    totalServices = filteredServices.length;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4 mb-4">';

    if (currentPage > 1) {
        paginationHTML += `<button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage - 1}">Anterior</button>`;
    }

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage 
            ? 'bg-green-600 text-white' 
            : 'border border-gray-300 hover:bg-gray-100';
        paginationHTML += `<button class="px-3 py-1.5 text-sm rounded-lg transition-colors ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage + 1}">Siguiente</button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            applyFiltersAndRender();
        });
    });
};

// --- FILTROS ---
const applyFiltersAndRender = () => {
    const searchTerm = serviceSearchInput?.value.toLowerCase().trim() || '';
    const selectedDate = serviceDateFilter?.value || '';

    let filtered = [...allCompletedServices];

    if (currentFilters.petId) {
        filtered = filtered.filter(service => service.pets?.id === currentFilters.petId);
    }

    if (searchTerm) {
        filtered = filtered.filter(service => {
            const petName = service.pets?.name?.toLowerCase() || '';
            const ownerProfile = service.profiles;
            const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name)
                ? `${ownerProfile.first_name} ${ownerProfile.last_name}`.toLowerCase()
                : ownerProfile?.full_name?.toLowerCase() || '';
            return petName.includes(searchTerm) || ownerName.includes(searchTerm);
        });
    }

    if (selectedDate) {
        filtered = filtered.filter(service => service.appointment_date === selectedDate);
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedServices = filtered.slice(startIndex, endIndex);

    renderServicesTable(paginatedServices);
    renderPagination(filtered);
};

const clearFilters = () => {
    if (serviceSearchInput) serviceSearchInput.value = '';
    if (serviceDateFilter) serviceDateFilter.value = '';
    currentFilters.petId = '';
    currentFilters.petName = '';
    currentPage = 1;
    
    window.history.replaceState({}, '', '/public/modules/dashboard/dashboard-services.html');
    
    if (headerTitle) headerTitle.textContent = 'Historial de Servicios';
    
    applyFiltersAndRender();
};

// --- MODAL Y LÓGICA DE EDICIÓN ---
const openServiceDetailsModal = (service) => {
    selectedService = service;
    if (!service) return;

    const ownerProfile = service.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin cliente';

    const petName = service.pets?.name || 'Sin mascota';
    const paymentMethod = service.payment_method || 'No especificado';
    const cost = service.service_price ? `S/ ${service.service_price.toFixed(2)}` : 'No especificado';
    const finalWeight = service.final_weight ? `${service.final_weight} kg` : 'No registrado';
    const observations = service.final_observations || 'Sin observaciones';

    const photos = service.appointment_photos || [];
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
    const departurePhoto = photos.find(p => p.photo_type === 'departure');

    const arrivalPhotoHTML = arrivalPhoto 
        ? `<img src="${arrivalPhoto.image_url}" alt="Foto de llegada" class="rounded-lg object-cover w-full h-full">`
        : `<div class="text-gray-400 text-sm">Sin foto</div>`;

    const departurePhotoHTML = departurePhoto 
        ? `<img src="${departurePhoto.image_url}" alt="Foto de salida" class="rounded-lg object-cover w-full h-full">`
        : `<div class="text-gray-400 text-sm">Sin foto</div>`;

    modalServiceDetailsView.innerHTML = `
        <div class="space-y-6">
            <div class="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 mb-2">Cliente</h4>
                        <p class="text-lg font-bold text-gray-900">${ownerName}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 mb-2">Mascota</h4>
                        <p class="text-lg font-bold text-gray-900">${petName}</p>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Fecha del Servicio</h4>
                    <p class="text-base text-gray-900">${new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Hora</h4>
                    <p class="text-base text-gray-900">${service.appointment_time}</p>
                </div>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="text-sm font-semibold text-gray-500 mb-2">Servicio Realizado</h4>
                <p class="text-base text-gray-900">${service.service || 'Servicio general'}</p>
            </div>
            <div>
                <h4 class="text-lg font-bold text-gray-800 mb-4">Fotos del Servicio</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p class="text-sm font-semibold text-gray-600 mb-3 text-center">Foto de Llegada</p>
                        <div class="bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden border-2 border-gray-200">
                            ${arrivalPhotoHTML}
                        </div>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-600 mb-3 text-center">Foto de Salida</p>
                        <div class="bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden border-2 border-gray-200">
                            ${departurePhotoHTML}
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div class="text-center">
                    <h4 class="text-sm font-semibold text-gray-600 mb-2">Método de Pago</h4>
                    <p class="text-lg font-bold text-gray-900">${paymentMethod}</p>
                </div>
                <div class="text-center">
                    <h4 class="text-sm font-semibold text-gray-600 mb-2">Costo Total</h4>
                    <p class="text-2xl font-bold text-green-700">${cost}</p>
                </div>
                <div class="text-center">
                    <h4 class="text-sm font-semibold text-gray-600 mb-2">Peso Final</h4>
                    <p class="text-lg font-bold text-gray-900">${finalWeight}</p>
                </div>
            </div>
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
                <h4 class="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Observaciones Finales
                </h4>
                <p class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">${observations}</p>
            </div>
        </div>
    `;

    switchToViewMode();
    serviceDetailsModal.classList.remove('hidden');
};

const closeModal = () => {
    serviceDetailsModal.classList.add('hidden');
    selectedService = null;
};

const switchToViewMode = () => {
    modalServiceDetailsView.classList.remove('hidden');
    modalServiceEditForm.classList.add('hidden');
    editServiceBtn.classList.remove('hidden');
    saveServiceBtn.classList.add('hidden');
    cancelEditBtn.classList.add('hidden');
};

const switchToEditMode = () => {
    if (!selectedService) return;

    // Poblar el formulario
    document.getElementById('edit-service-id').value = selectedService.id;
    document.getElementById('edit-service-price').value = selectedService.service_price || '';
    document.getElementById('edit-payment-method').value = selectedService.payment_method || 'Efectivo';
    document.getElementById('edit-final-weight').value = selectedService.final_weight || '';
    document.getElementById('edit-final-observations').value = selectedService.final_observations || '';

    // Cambiar vistas
    modalServiceDetailsView.classList.add('hidden');
    modalServiceEditForm.classList.remove('hidden');
    editServiceBtn.classList.add('hidden');
    saveServiceBtn.classList.remove('hidden');
    cancelEditBtn.classList.remove('hidden');
};

const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedService) return;

    saveServiceBtn.disabled = true;
    saveServiceBtn.textContent = 'Guardando...';

    const updatedData = {
        service_price: parseFloat(document.getElementById('edit-service-price').value) || 0,
        payment_method: document.getElementById('edit-payment-method').value,
        final_weight: parseFloat(document.getElementById('edit-final-weight').value) || null,
        final_observations: document.getElementById('edit-final-observations').value.trim()
    };

    const { error } = await supabase
        .from('appointments')
        .update(updatedData)
        .eq('id', selectedService.id);
    
    if (error) {
        alert('Error al guardar los cambios: ' + error.message);
    } else {
        // Actualizar datos locales y volver a renderizar
        const index = allCompletedServices.findIndex(s => s.id === selectedService.id);
        if (index !== -1) {
            allCompletedServices[index] = { ...allCompletedServices[index], ...updatedData };
        }
        openServiceDetailsModal(allCompletedServices[index]); // Recargar modal con datos frescos
        applyFiltersAndRender(); // Recargar tabla principal
    }

    saveServiceBtn.disabled = false;
    saveServiceBtn.textContent = 'Guardar Cambios';
};

// --- LISTENERS ---
const attachServiceRowListeners = () => {
    document.querySelectorAll('.view-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const serviceId = row.dataset.serviceId;
            const service = allCompletedServices.find(s => s.id == serviceId);
            if (service) openServiceDetailsModal(service);
        });
    });
};

// --- INICIALIZACIÓN ---
const initializeServicesPage = async () => {
    if (petIdFromUrl) {
        currentFilters.petId = petIdFromUrl;
        currentFilters.petName = petNameFromUrl ? decodeURIComponent(petNameFromUrl) : '';
        if (headerTitle && currentFilters.petName) {
            headerTitle.textContent = `Historial de Servicios - ${currentFilters.petName}`;
        }
    } else {
        if (headerTitle) headerTitle.textContent = 'Historial de Servicios';
    }

    servicesTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Cargando servicios...</td></tr>';

    allCompletedServices = await getCompletedServices();
    const stats = await getServicesStats();

    if (totalServicesCount) totalServicesCount.textContent = stats.total;
    if (completedServicesCount) completedServicesCount.textContent = stats.completed;
    if (monthServicesCount) monthServicesCount.textContent = stats.month;

    applyFiltersAndRender();

    serviceSearchInput?.addEventListener('input', () => { currentPage = 1; applyFiltersAndRender(); });
    serviceDateFilter?.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });
    clearFiltersBtn?.addEventListener('click', clearFilters);
    closeServiceModal?.addEventListener('click', closeModal);

    // Listeners de los botones del modal
    editServiceBtn.addEventListener('click', switchToEditMode);
    cancelEditBtn.addEventListener('click', switchToViewMode);
    modalServiceEditForm.addEventListener('submit', handleSaveChanges);
};

initializeServicesPage();
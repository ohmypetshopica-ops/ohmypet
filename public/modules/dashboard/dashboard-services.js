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

// Modal
const serviceDetailsModal = document.querySelector('#service-details-modal');
const modalServiceDetails = document.querySelector('#modal-service-details');
const closeServiceModal = document.querySelector('#close-service-modal');

// --- VARIABLES DE PAGINACIÓN ---
let currentPage = 1;
const itemsPerPage = 10;
let totalServices = 0;
let currentFilters = { search: '', date: '' };
let allCompletedServices = [];

// --- FUNCIONES DE API ---
const getCompletedServices = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            appointment_time,
            service,
            service_price,
            payment_method,
            final_observations,
            final_weight,
            pets (
                id,
                name
            ),
            profiles (
                id,
                full_name,
                first_name,
                last_name
            )
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
                <div class="text-sm text-gray-900">${new Date(service.appointment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
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
        servicesTableBody.innerHTML = services.map(service => createServiceRow(service)).join('');
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
    currentPage = 1;
    applyFiltersAndRender();
};

// --- MODAL ---
const openServiceDetailsModal = (service) => {
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

    modalServiceDetails.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Cliente</h4>
                    <p class="text-base text-gray-900">${ownerName}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Mascota</h4>
                    <p class="text-base text-gray-900">${petName}</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Fecha</h4>
                    <p class="text-base text-gray-900">${new Date(service.appointment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Hora</h4>
                    <p class="text-base text-gray-900">${service.appointment_time}</p>
                </div>
            </div>

            <div>
                <h4 class="text-sm font-semibold text-gray-500 mb-2">Servicio</h4>
                <p class="text-base text-gray-900">${service.service || 'Servicio general'}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-green-50 rounded-lg">
                <div>
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Método de Pago</h4>
                    <p class="text-base font-medium text-gray-900">${paymentMethod}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Costo</h4>
                    <p class="text-base font-bold text-green-700">${cost}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-500 mb-2">Peso Final</h4>
                    <p class="text-base font-medium text-gray-900">${finalWeight}</p>
                </div>
            </div>

            <div>
                <h4 class="text-sm font-semibold text-gray-500 mb-2">Observaciones Finales</h4>
                <p class="text-base text-gray-900 whitespace-pre-wrap">${observations}</p>
            </div>
        </div>
    `;

    serviceDetailsModal.classList.remove('hidden');
};

const closeModal = () => {
    serviceDetailsModal.classList.add('hidden');
};

// --- LISTENERS ---
const attachServiceRowListeners = () => {
    document.querySelectorAll('.view-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const serviceId = row.dataset.serviceId;
            const service = allCompletedServices.find(s => s.id === serviceId);
            if (service) openServiceDetailsModal(service);
        });
    });
};

// --- INICIALIZACIÓN ---
const initializeServicesPage = async () => {
    if (headerTitle) headerTitle.textContent = 'Historial de Servicios';

    servicesTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Cargando servicios...</td></tr>';

    allCompletedServices = await getCompletedServices();
    const stats = await getServicesStats();

    if (totalServicesCount) totalServicesCount.textContent = stats.total;
    if (completedServicesCount) completedServicesCount.textContent = stats.completed;
    if (monthServicesCount) monthServicesCount.textContent = stats.month;

    applyFiltersAndRender();

    serviceSearchInput?.addEventListener('input', () => {
        currentPage = 1;
        applyFiltersAndRender();
    });
    
    serviceDateFilter?.addEventListener('change', () => {
        currentPage = 1;
        applyFiltersAndRender();
    });

    clearFiltersBtn?.addEventListener('click', clearFilters);
    closeServiceModal?.addEventListener('click', closeModal);
};

initializeServicesPage();
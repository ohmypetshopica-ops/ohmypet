import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const servicesTableBody = document.querySelector('#services-table-body');
const serviceSearchInput = document.querySelector('#service-search-input');
const serviceStatusFilter = document.querySelector('#service-status-filter');
const serviceDateFilter = document.querySelector('#service-date-filter');
const clearFiltersBtn = document.querySelector('#clear-filters-btn');
const filterSubtitle = document.querySelector('#filter-subtitle');
const totalServicesCount = document.querySelector('#total-services-count');
const completedServicesCount = document.querySelector('#completed-services-count');
const pendingServicesCount = document.querySelector('#pending-services-count');
const monthServicesCount = document.querySelector('#month-services-count');
const paginationContainer = document.querySelector('#pagination-container');
const headerTitle = document.querySelector('#header-title');

// Modal
const serviceDetailsModal = document.querySelector('#service-details-modal');
const closeModalBtn = document.querySelector('#close-modal-btn');
const closeModalBottomBtn = document.querySelector('#close-modal-bottom-btn');

// --- VARIABLES DE PAGINACIÓN ---
let currentPage = 1;
const itemsPerPage = 10;
let totalServices = 0;
let currentFilters = { search: '', status: '', date: '', petId: '' };

// --- FUNCIONES DE API ---
const getServicesPaginated = async (page = 1, filters = {}) => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            appointment_time,
            service,
            status,
            final_observations,
            final_weight,
            pet_id,
            pets (
                id,
                name
            ),
            profiles (
                first_name,
                last_name,
                full_name
            )
        `, { count: 'exact' });

    if (filters.search) {
        query = query.or(`pets.name.ilike.%${filters.search}%,profiles.first_name.ilike.%${filters.search}%,profiles.last_name.ilike.%${filters.search}%,profiles.full_name.ilike.%${filters.search}%`);
    }

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    if (filters.date) {
        query = query.eq('appointment_date', filters.date);
    }

    if (filters.petId) {
        query = query.eq('pet_id', filters.petId);
    }

    const { data, error, count } = await query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error al obtener servicios:', error);
        return { services: [], total: 0 };
    }

    return { services: data || [], total: count || 0 };
};

const getServiceDetails = async (serviceId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            appointment_time,
            service,
            status,
            final_observations,
            final_weight,
            pets (
                name
            ),
            profiles (
                first_name,
                last_name,
                full_name
            )
        `)
        .eq('id', serviceId)
        .single();

    if (error) {
        console.error('Error al obtener detalles del servicio:', error);
        return null;
    }

    return data;
};

const getStats = async (petId = null) => {
    let totalQuery = supabase.from('appointments').select('*', { count: 'exact', head: true });
    let completedQuery = supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'completada');
    let pendingQuery = supabase.from('appointments').select('*', { count: 'exact', head: true }).in('status', ['pendiente', 'confirmada']);

    if (petId) {
        totalQuery = totalQuery.eq('pet_id', petId);
        completedQuery = completedQuery.eq('pet_id', petId);
        pendingQuery = pendingQuery.eq('pet_id', petId);
    }

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    let monthQuery = supabase.from('appointments').select('*', { count: 'exact', head: true })
        .gte('appointment_date', firstDayOfMonth)
        .lte('appointment_date', lastDayOfMonth);

    if (petId) {
        monthQuery = monthQuery.eq('pet_id', petId);
    }

    const [totalRes, completedRes, pendingRes, monthRes] = await Promise.all([
        totalQuery,
        completedQuery,
        pendingQuery,
        monthQuery
    ]);

    return {
        total: totalRes.count || 0,
        completed: completedRes.count || 0,
        pending: pendingRes.count || 0,
        month: monthRes.count || 0
    };
};

const getPetName = async (petId) => {
    const { data, error } = await supabase
        .from('pets')
        .select('name')
        .eq('id', petId)
        .single();

    if (error) {
        console.error('Error al obtener nombre de mascota:', error);
        return null;
    }

    return data?.name;
};

// --- RENDERIZADO DE TABLA ---
const createServiceRow = (service) => {
    const ownerProfile = service.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin cliente';

    const petName = service.pets?.name || 'Sin mascota';

    const statusClass = {
        'pendiente': 'bg-yellow-100 text-yellow-800',
        'confirmada': 'bg-blue-100 text-blue-800',
        'completada': 'bg-green-100 text-green-800',
        'cancelada': 'bg-gray-100 text-gray-800',
        'rechazada': 'bg-red-100 text-red-800'
    };

    const statusText = {
        'pendiente': 'Pendiente',
        'confirmada': 'Confirmada',
        'completada': 'Completada',
        'cancelada': 'Cancelada',
        'rechazada': 'Rechazada'
    };

    return `
        <tr class="hover:bg-gray-50 transition-colors" data-service-id="${service.id}">
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">${new Date(service.appointment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                <div class="text-sm text-gray-500">${service.appointment_time}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${ownerName}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">${petName}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700">${service.service || 'Servicio general'}</div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass[service.status] || 'bg-gray-100 text-gray-800'}">
                    ${statusText[service.status] || service.status}
                </span>
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 font-semibold view-service-btn">
                    Ver Detalles
                </button>
            </td>
        </tr>
    `;
};

const renderServicesTable = (services) => {
    if (services.length > 0) {
        servicesTableBody.innerHTML = services.map(service => createServiceRow(service)).join('');
    } else {
        servicesTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No se encontraron servicios.</td></tr>';
    }
};

// --- PAGINACIÓN ---
const renderPagination = () => {
    const totalPages = Math.ceil(totalServices / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4 mb-4">';

    if (currentPage > 1) {
        paginationHTML += `<button class="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100" data-page="${currentPage - 1}">Anterior</button>`;
    }

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'bg-green-600 text-white' : 'border border-gray-300 hover:bg-gray-100';
        paginationHTML += `<button class="px-3 py-1 rounded-lg ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100" data-page="${currentPage + 1}">Siguiente</button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async () => {
            currentPage = parseInt(btn.dataset.page);
            await loadServices();
        });
    });
};

// --- CARGA DE SERVICIOS ---
const loadServices = async () => {
    servicesTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Cargando servicios...</td></tr>';
    
    const { services, total } = await getServicesPaginated(currentPage, currentFilters);
    totalServices = total;
    
    renderServicesTable(services);
    renderPagination();
};

// --- FILTROS ---
const applyFilters = async () => {
    currentFilters.search = serviceSearchInput?.value.trim() || '';
    currentFilters.status = serviceStatusFilter?.value || '';
    currentFilters.date = serviceDateFilter?.value || '';
    currentPage = 1;
    await loadServices();
};

const clearFilters = async () => {
    if (serviceSearchInput) serviceSearchInput.value = '';
    if (serviceStatusFilter) serviceStatusFilter.value = '';
    if (serviceDateFilter) serviceDateFilter.value = '';
    
    const urlParams = new URLSearchParams(window.location.search);
    const petId = urlParams.get('pet');
    
    currentFilters = { search: '', status: '', date: '', petId: petId || '' };
    currentPage = 1;
    await loadServices();
};

// --- MODAL ---
const openServiceDetailsModal = async (serviceId) => {
    const service = await getServiceDetails(serviceId);
    if (!service) return;

    const ownerProfile = service.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin cliente';

    const petName = service.pets?.name || 'Sin mascota';

    const statusClass = {
        'pendiente': 'text-yellow-800',
        'confirmada': 'text-blue-800',
        'completada': 'text-green-800',
        'cancelada': 'text-gray-800',
        'rechazada': 'text-red-800'
    };

    const statusText = {
        'pendiente': 'Pendiente',
        'confirmada': 'Confirmada',
        'completada': 'Completada',
        'cancelada': 'Cancelada',
        'rechazada': 'Rechazada'
    };

    document.querySelector('#modal-service-date').textContent = `${new Date(service.appointment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${service.appointment_time}`;
    document.querySelector('#modal-service-client').textContent = ownerName;
    document.querySelector('#modal-service-pet').textContent = petName;
    document.querySelector('#modal-service-type').textContent = service.service || 'Servicio general';
    
    const statusElement = document.querySelector('#modal-service-status');
    statusElement.textContent = statusText[service.status] || service.status;
    statusElement.className = `font-semibold ${statusClass[service.status] || 'text-gray-800'}`;

    document.querySelector('#modal-service-observations').textContent = service.final_observations || 'Sin observaciones registradas';
    document.querySelector('#modal-service-weight').textContent = service.final_weight ? `${service.final_weight} kg` : 'No registrado';

    serviceDetailsModal.classList.remove('hidden');
};

const closeServiceDetailsModal = () => {
    serviceDetailsModal.classList.add('hidden');
};

// --- INICIALIZACIÓN ---
const initializeServicesSection = async () => {
    if (headerTitle) headerTitle.textContent = 'Historial de Servicios';

    const urlParams = new URLSearchParams(window.location.search);
    const petId = urlParams.get('pet');

    if (petId) {
        currentFilters.petId = petId;
        const petName = await getPetName(petId);
        if (petName && filterSubtitle) {
            filterSubtitle.textContent = `Mostrando servicios de: ${petName}`;
        }
    }

    const stats = await getStats(petId);
    if (totalServicesCount) totalServicesCount.textContent = stats.total;
    if (completedServicesCount) completedServicesCount.textContent = stats.completed;
    if (pendingServicesCount) pendingServicesCount.textContent = stats.pending;
    if (monthServicesCount) monthServicesCount.textContent = stats.month;

    await loadServices();

    if (serviceSearchInput) serviceSearchInput.addEventListener('input', applyFilters);
    if (serviceStatusFilter) serviceStatusFilter.addEventListener('change', applyFilters);
    if (serviceDateFilter) serviceDateFilter.addEventListener('change', applyFilters);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeServiceDetailsModal);
    if (closeModalBottomBtn) closeModalBottomBtn.addEventListener('click', closeServiceDetailsModal);

    if (servicesTableBody) {
        servicesTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('view-service-btn')) {
                const row = e.target.closest('tr');
                const serviceId = row.dataset.serviceId;
                await openServiceDetailsModal(serviceId);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', initializeServicesSection);
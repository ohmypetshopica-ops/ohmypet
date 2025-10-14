import { getCompletedAppointments } from './dashboard.api.js';
import { createServiceHistoryRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const tableBody = document.querySelector('#services-history-table-body');
const searchInput = document.querySelector('#history-search-input');
const paymentFilter = document.querySelector('#history-payment-filter');
const clearFiltersBtn = document.querySelector('#history-clear-filters-btn');
const headerTitle = document.querySelector('#header-title');

let allCompletedServices = [];

// --- RENDERIZADO Y FILTROS ---

const renderTable = (services) => {
    if (!tableBody) return;
    tableBody.innerHTML = services.length > 0 
        ? services.map(createServiceHistoryRow).join('') 
        : `<tr><td colspan="5" class="text-center py-8 text-gray-500">No se encontraron servicios que coincidan con los filtros.</td></tr>`;
};

const applyFilters = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const paymentMethod = paymentFilter.value;

    let filtered = [...allCompletedServices];

    // Filtrar por término de búsqueda
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

    // Filtrar por método de pago
    if (paymentMethod) {
        filtered = filtered.filter(service => service.payment_method === paymentMethod);
    }

    renderTable(filtered);
};

// --- INICIALIZACIÓN ---

const initializeHistoryPage = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Historial de Servicios';
    }

    allCompletedServices = await getCompletedAppointments();
    renderTable(allCompletedServices);

    // Añadir listeners para los filtros
    searchInput?.addEventListener('input', applyFilters);
    paymentFilter?.addEventListener('change', applyFilters);

    clearFiltersBtn?.addEventListener('click', () => {
        searchInput.value = '';
        paymentFilter.value = '';
        renderTable(allCompletedServices);
    });
};

initializeHistoryPage();
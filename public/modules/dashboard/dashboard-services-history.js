import { getCompletedAppointments } from './dashboard.api.js';
import { createServiceHistoryRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const tableBody = document.querySelector('#services-history-table-body');
const searchInput = document.querySelector('#history-search-input');
const headerTitle = document.querySelector('#header-title');

let allCompletedServices = [];

// --- RENDERIZADO Y FILTROS ---

const renderTable = (services) => {
    if (!tableBody) return;
    tableBody.innerHTML = services.length > 0 
        ? services.map(createServiceHistoryRow).join('') 
        : `<tr><td colspan="5" class="text-center py-8 text-gray-500">No se encontraron servicios completados.</td></tr>`;
};

const applySearch = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (!searchTerm) {
        renderTable(allCompletedServices);
        return;
    }

    const filtered = allCompletedServices.filter(service => {
        const petName = service.pets?.name?.toLowerCase() || '';
        const ownerProfile = service.profiles;
        const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name)
            ? `${ownerProfile.first_name} ${ownerProfile.last_name}`.toLowerCase()
            : ownerProfile?.full_name?.toLowerCase() || '';
        return petName.includes(searchTerm) || ownerName.includes(searchTerm);
    });

    renderTable(filtered);
};

// --- INICIALIZACIÓN ---

const initializeHistoryPage = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Historial de Servicios';
    }

    allCompletedServices = await getCompletedAppointments();
    renderTable(allCompletedServices);

    searchInput?.addEventListener('input', applySearch);
};

initializeHistoryPage();
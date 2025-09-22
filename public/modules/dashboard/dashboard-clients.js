// public/modules/dashboard/dashboard-clients.js

import { supabase } from '../../core/supabase.js';
import { getClients, searchClients } from './dashboard.api.js';
import { createClientRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input');
const headerTitle = document.querySelector('#header-title');

// --- RENDERIZADO DE DATOS ---
const renderClientsTable = async (clients) => {
    clientsTableBody.innerHTML = clients.length > 0 ? clients.map(createClientRow).join('') : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
};

// --- MANEJO DE EVENTOS Y ACCIONES ---
const setupClientSearch = () => {
    clientSearchInput.addEventListener('input', async (event) => {
        const searchTerm = event.target.value.trim();
        const clients = searchTerm ? await searchClients(searchTerm) : await getClients();
        renderClientsTable(clients);
    });
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    headerTitle.textContent = 'Gestión de Clientes';
    const clients = await getClients();
    renderClientsTable(clients);
    setupClientSearch();
});
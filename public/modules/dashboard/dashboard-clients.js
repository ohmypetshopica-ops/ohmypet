// public/modules/dashboard/dashboard-clients.js

import { getClients, searchClients, getClientDetails } from './dashboard.api.js';
import { createClientRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input');
const headerTitle = document.querySelector('#header-title');

// --- ELEMENTOS DEL MODAL ---
const clientDetailsModal = document.querySelector('#client-details-modal');
const modalCloseBtn = document.querySelector('#modal-close-btn');
const modalClientName = document.querySelector('#modal-client-name');
const modalContentBody = document.querySelector('#modal-content-body');

// --- RENDERIZADO DE DATOS ---
const renderClientsTable = (clients) => {
    if (!clientsTableBody) return;
    clientsTableBody.innerHTML = clients.length > 0 
        ? clients.map(createClientRow).join('') 
        : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
};

// --- LÓGICA DEL MODAL ---
const openModal = () => clientDetailsModal.classList.remove('hidden');
const closeModal = () => clientDetailsModal.classList.add('hidden');

const populateModal = (details) => {
    const { profile, pets, appointments } = details;

    const displayName = (profile.first_name && profile.last_name) 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.full_name;
    
    modalClientName.textContent = displayName;

    modalContentBody.innerHTML = `
        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Información de Contacto</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p><strong>Email:</strong> ${profile.email || 'N/A'}</p>
                <p><strong>Teléfono:</strong> ${profile.phone || 'N/A'}</p>
                <p><strong>Distrito:</strong> ${profile.district || 'N/A'}</p>
            </div>
        </div>

        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Mascotas Registradas (${pets.length})</h3>
            <div class="space-y-2">
                ${pets.length > 0 ? pets.map(pet => `
                    <div class="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                        <img src="${pet.image_url || 'https://via.placeholder.com/40'}" alt="${pet.name}" class="h-10 w-10 rounded-full object-cover">
                        <div>
                            <p class="font-semibold">${pet.name}</p>
                            <p class="text-xs text-gray-600">${pet.breed || 'Raza no especificada'}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No tiene mascotas registradas.</p>'}
            </div>
        </div>

        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Historial de Citas (${appointments.length})</h3>
            <div class="space-y-2 max-h-48 overflow-y-auto">
                ${appointments.length > 0 ? appointments.map(app => `
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <div class="flex justify-between items-center">
                            <p class="font-semibold">${app.appointment_date} - ${app.pets?.name || 'Mascota eliminada'}</p>
                            <span class="px-2 text-xs font-semibold rounded-full capitalize ${
                                app.status === 'completada' ? 'bg-green-100 text-green-800' :
                                app.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }">${app.status}</span>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No tiene citas registradas.</p>'}
            </div>
        </div>
    `;
};

// --- LÓGICA DE BÚSQUEDA Y EVENTOS ---
const setupEventListeners = () => {
    if (!clientSearchInput) return;
    
    let debounceTimer;
    clientSearchInput.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const searchTerm = event.target.value.trim();
            clientsTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">Buscando...</td></tr>`;
            const clients = searchTerm ? await searchClients(searchTerm) : await getClients();
            renderClientsTable(clients);
        }, 300);
    });

    // Event Delegation para los botones "Ver Detalles"
    clientsTableBody.addEventListener('click', async (event) => {
        const viewButton = event.target.closest('.view-details-btn');
        if (viewButton) {
            const clientId = viewButton.dataset.clientId;
            openModal();
            modalContentBody.innerHTML = '<div class="text-center py-10 text-gray-500">Cargando...</div>';
            
            const clientDetails = await getClientDetails(clientId);
            if (clientDetails) {
                populateModal(clientDetails);
            } else {
                modalContentBody.innerHTML = '<div class="text-center py-10 text-red-500">Error al cargar los detalles.</div>';
            }
        }
    });

    // Listeners para cerrar el modal
    modalCloseBtn.addEventListener('click', closeModal);
    clientDetailsModal.addEventListener('click', (event) => {
        if (event.target === clientDetailsModal) {
            closeModal();
        }
    });
};

// --- INICIALIZACIÓN DE LA SECCIÓN ---
const initializeClientsSection = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Gestión de Clientes';
    }
    
    const initialClients = await getClients();
    renderClientsTable(initialClients);
    setupEventListeners();
};

document.addEventListener('DOMContentLoaded', initializeClientsSection);
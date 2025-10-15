// public/modules/dashboard/dashboard-clients.js

import { getClients, searchClients, getClientDetails, registerClientFromDashboard } from './dashboard.api.js';
import { createClientRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input');
const headerTitle = document.querySelector('#header-title');

// --- ELEMENTOS DEL MODAL DE DETALLES ---
const clientDetailsModal = document.querySelector('#client-details-modal');
const modalCloseBtn = document.querySelector('#modal-close-btn');
const modalClientName = document.querySelector('#modal-client-name');
const modalContentBody = document.querySelector('#modal-content-body');

// --- ELEMENTOS DEL MODAL DE REGISTRO ---
const addClientButton = document.querySelector('#add-client-button');
const clientModal = document.querySelector('#client-modal');
const closeClientModalButton = document.querySelector('#close-client-modal-button');
const cancelClientButton = document.querySelector('#cancel-client-button');
const clientForm = document.querySelector('#client-form');
const clientFormMessage = document.querySelector('#client-form-message');

// --- RENDERIZADO DE DATOS ---
const renderClientsTable = (clients) => {
    if (!clientsTableBody) return;
    clientsTableBody.innerHTML = clients.length > 0 
        ? clients.map(createClientRow).join('') 
        : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
};

// --- LÓGICA DEL MODAL DE DETALLES ---
const openDetailsModal = () => clientDetailsModal.classList.remove('hidden');
const closeDetailsModal = () => clientDetailsModal.classList.add('hidden');

const populateModal = (details) => {
    const { profile, pets, appointments } = details;

    const displayName = (profile.first_name && profile.last_name) 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.full_name;
    
    modalClientName.textContent = displayName;

    modalContentBody.innerHTML = `
        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Información de Contacto</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <p><strong>Email:</strong> <a href="mailto:${profile.email || ''}" class="text-blue-600 hover:underline">${profile.email || 'N/A'}</a></p>
                <p><strong>Teléfono:</strong> <a href="https://wa.me/${profile.phone || ''}" target="_blank" class="text-blue-600 hover:underline">${profile.phone || 'N/A'}</a></p>
                <p><strong>Distrito:</strong> ${profile.district || 'N/A'}</p>
                <p><strong>Contacto Emergencia:</strong> ${profile.emergency_contact_name || 'N/A'} (${profile.emergency_contact_phone || 'N/A'})</p>
            </div>
        </div>

        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Mascotas Registradas (${pets.length})</h3>
            <div class="space-y-3">
                ${pets.length > 0 ? pets.map(pet => `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <p class="font-bold text-gray-800">${pet.name}</p>
                        <p class="text-sm text-gray-600">Especie: ${pet.species || 'N/A'} | Raza: ${pet.breed || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Tamaño: ${pet.size || 'N/A'} | Sexo: ${pet.sex || 'N/A'}</p>
                    </div>
                `).join('') : '<p class="text-gray-500 text-sm">Sin mascotas registradas.</p>'}
            </div>
        </div>

        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Historial de Citas (${appointments.length})</h3>
            <div class="space-y-2">
                ${appointments.length > 0 ? appointments.map(apt => `
                    <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p class="font-medium text-gray-800">${apt.appointment_date} - ${apt.appointment_time}</p>
                            <p class="text-sm text-gray-600">${apt.service || 'Servicio no especificado'} (${apt.pets?.name || 'N/A'})</p>
                        </div>
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                            apt.status === 'completada' ? 'bg-green-100 text-green-800' :
                            apt.status === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                            apt.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }">${apt.status}</span>
                    </div>
                `).join('') : '<p class="text-gray-500 text-sm">Sin citas registradas.</p>'}
            </div>
        </div>
    `;
};

// --- LÓGICA DEL MODAL DE REGISTRO ---
const setupClientModal = () => {
    // Abrir modal
    addClientButton?.addEventListener('click', () => {
        clientModal.classList.remove('hidden');
        clientForm.reset();
        clientFormMessage.classList.add('hidden');
    });

    // Cerrar modal
    const closeModal = () => {
        clientModal.classList.add('hidden');
        clientForm.reset();
        clientFormMessage.classList.add('hidden');
    };

    closeClientModalButton?.addEventListener('click', closeModal);
    cancelClientButton?.addEventListener('click', closeModal);
    
    clientModal?.addEventListener('click', (e) => {
        if (e.target === clientModal) closeModal();
    });

    // Enviar formulario
    clientForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        clientFormMessage.classList.add('hidden');

        const clientData = {
            email: clientForm.email.value.trim(),
            firstName: clientForm.first_name.value.trim(),
            lastName: clientForm.last_name.value.trim(),
            phone: clientForm.phone.value.trim(),
            district: clientForm.district.value.trim()
        };

        // Validaciones básicas
        if (!clientData.email || !clientData.firstName || !clientData.lastName) {
            clientFormMessage.textContent = 'Por favor completa todos los campos obligatorios.';
            clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
            clientFormMessage.classList.remove('hidden');
            return;
        }

        const result = await registerClientFromDashboard(clientData);

        if (result.success) {
            clientFormMessage.textContent = result.message || 'Cliente registrado exitosamente.';
            clientFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
            clientFormMessage.classList.remove('hidden');
            
            setTimeout(() => {
                closeModal();
                initializeClientsSection();
            }, 2000);
        } else {
            clientFormMessage.textContent = `Error: ${result.error?.message || 'No se pudo registrar el cliente'}`;
            clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
            clientFormMessage.classList.remove('hidden');
        }
    });
};

// --- EVENT LISTENERS ---
const setupEventListeners = () => {
    // Búsqueda de clientes
    let searchTimeout;
    clientSearchInput?.addEventListener('input', async (event) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const searchTerm = event.target.value.trim();
            const clients = searchTerm.length > 0 
                ? await searchClients(searchTerm) 
                : await getClients();
            renderClientsTable(clients);
        }, 300);
    });

    // Event Delegation para los botones "Ver Detalles"
    clientsTableBody?.addEventListener('click', async (event) => {
        const viewButton = event.target.closest('.view-details-btn');
        if (viewButton) {
            const clientId = viewButton.dataset.clientId;
            if (!clientId) return;

            openDetailsModal();
            modalContentBody.innerHTML = '<div class="text-center py-10 text-gray-500">Cargando...</div>';
            
            const clientDetails = await getClientDetails(clientId);
            
            if (clientDetails) {
                populateModal(clientDetails);
            } else {
                modalContentBody.innerHTML = '<div class="text-center py-10 text-red-500">Error al cargar los detalles del cliente.</div>';
            }
        }
    });

    // Listeners para cerrar el modal de detalles
    modalCloseBtn?.addEventListener('click', closeDetailsModal);
    clientDetailsModal?.addEventListener('click', (event) => {
        if (event.target === clientDetailsModal) {
            closeDetailsModal();
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
    setupClientModal();
};

document.addEventListener('DOMContentLoaded', initializeClientsSection);
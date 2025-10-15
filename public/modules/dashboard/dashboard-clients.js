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
                    <div class="bg-gray-50 p-3 rounded-lg flex items-center gap-4 border border-gray-200">
                        <img src="${pet.image_url || 'https://via.placeholder.com/40'}" alt="${pet.name}" class="h-12 w-12 rounded-full object-cover">
                        <div>
                            <p class="font-semibold text-gray-900">${pet.name}</p>
                            <p class="text-xs text-gray-600">${pet.breed || 'Raza no especificada'} | ${pet.sex || 'N/A'}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No tiene mascotas registradas.</p>'}
            </div>
        </div>

        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Historial de Citas (${appointments.length})</h3>
            <div class="space-y-2 max-h-48 overflow-y-auto">
                ${appointments.length > 0 ? appointments.map(app => `
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div class="flex justify-between items-center">
                            <p class="font-semibold text-sm">${app.appointment_date} - ${app.pets?.name || 'Mascota eliminada'}</p>
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                app.status === 'completada' ? 'bg-green-100 text-green-800' :
                                app.status === 'cancelada' || app.status === 'rechazada' ? 'bg-red-100 text-red-800' :
                                app.status === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                            }">${app.status}</span>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No tiene citas registradas.</p>'}
            </div>
        </div>
    `;
};

// --- LÓGICA DEL MODAL DE REGISTRO ---
const setupClientModal = () => {
    if (!addClientButton || !clientModal || !clientForm) return;

    const closeRegisterModal = () => {
        clientModal.classList.add('hidden');
        clientForm.reset();
        clientFormMessage?.classList.add('hidden');
    };

    addClientButton.addEventListener('click', () => {
        clientModal.classList.remove('hidden');
        clientForm.reset();
        clientFormMessage?.classList.add('hidden');
    });

    closeClientModalButton?.addEventListener('click', closeRegisterModal);
    cancelClientButton?.addEventListener('click', closeRegisterModal);
    
    clientModal.addEventListener('click', (e) => {
        if (e.target === clientModal) closeRegisterModal();
    });

    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (clientFormMessage) clientFormMessage.classList.add('hidden');

        const clientData = {
            email: clientForm.email.value.trim(),
            firstName: clientForm.first_name.value.trim(),
            lastName: clientForm.last_name.value.trim(),
            phone: clientForm.phone.value.trim(),
            district: clientForm.district.value.trim()
        };

        if (!clientData.email || !clientData.firstName || !clientData.lastName) {
            if (clientFormMessage) {
                clientFormMessage.textContent = 'Por favor completa todos los campos obligatorios.';
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            return;
        }

        const result = await registerClientFromDashboard(clientData);

        if (result.success) {
            if (clientFormMessage) {
                clientFormMessage.textContent = result.message || 'Cliente registrado exitosamente.';
                clientFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            
            setTimeout(() => {
                closeRegisterModal();
                initializeClientsSection();
            }, 2000);
        } else {
            if (clientFormMessage) {
                clientFormMessage.textContent = `Error: ${result.error?.message || 'No se pudo registrar el cliente'}`;
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
        }
    });
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

    clientsTableBody.addEventListener('click', async (event) => {
        const viewButton = event.target.closest('.view-details-btn');
        if (viewButton) {
            const clientId = viewButton.dataset.clientId;
            if (!clientId) return;

            openModal();
            modalContentBody.innerHTML = '<div class="text-center py-10 text-gray-500">Cargando...</div>';
            
            const clientDetails = await getClientDetails(clientId);
            
            if (clientDetails) {
                populateModal(clientDetails);
            } else {
                modalContentBody.innerHTML = '<div class="text-center py-10 text-red-500">Error al cargar los detalles del cliente.</div>';
            }
        }
    });

    modalCloseBtn?.addEventListener('click', closeModal);
    clientDetailsModal?.addEventListener('click', (event) => {
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
    setupClientModal();
};

document.addEventListener('DOMContentLoaded', initializeClientsSection);
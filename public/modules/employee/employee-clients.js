// public/modules/employee/employee-clients.js
// Módulo de gestión de clientes

import { state, updateState } from './employee-state.js';
import { registerClientFromDashboard, getClientsWithPets, getClientDetails } from '../dashboard/dashboard.api.js';
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let clientSearch;
let clientsList;
let clientsListView;
let clientDetailsView;
let clientDetailsContent;
let backToClientsBtn;
let addClientBtnEmployee;
let clientModalEmployee;
let closeClientModalButtonEmployee;
let cancelClientButtonEmployee;
let clientFormEmployee;
let clientFormMessageEmployee;
// NUEVO
let clearSearchBtn; 

export function initClientElements() {
    clientSearch = document.getElementById('client-search');
    clientsList = document.getElementById('clients-list');
    clientsListView = document.getElementById('clients-list-view');
    clientDetailsView = document.getElementById('client-details-view');
    clientDetailsContent = document.getElementById('client-details-content');
    backToClientsBtn = document.getElementById('back-to-clients-btn');
    
    addClientBtnEmployee = document.querySelector('#add-client-btn-employee');
    clientModalEmployee = document.querySelector('#client-modal-employee');
    closeClientModalButtonEmployee = document.querySelector('#close-client-modal-button-employee');
    cancelClientButtonEmployee = document.querySelector('#cancel-client-button-employee');
    clientFormEmployee = document.querySelector('#client-form-employee');
    clientFormMessageEmployee = document.querySelector('#client-form-message-employee');
    
    // NUEVO
    clearSearchBtn = document.getElementById('clear-search-btn');
}

export function setupClientListeners() {
    if (clientSearch) {
        // Muestra/Oculta el botón "X" y filtra
        clientSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            if (term.length > 0) {
                clearSearchBtn?.classList.remove('hidden');
            } else {
                clearSearchBtn?.classList.add('hidden');
            }

            const filtered = term ? state.allClients.filter(c =>
                `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term) ||
                (c.phone || '').includes(term)
            ) : state.allClients;
            renderClients(filtered);
        });
    }

    // NUEVO: Limpia la búsqueda
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            clientSearch.value = '';
            clearSearchBtn.classList.add('hidden');
            renderClients(state.allClients); // Vuelve a renderizar la lista completa
        });
    }
    
    if (backToClientsBtn) {
        backToClientsBtn.addEventListener('click', () => {
            clientsListView?.classList.remove('hidden');
            clientDetailsView?.classList.add('hidden');
            updateState('currentClientId', null);
        });
    }
    
    if (clientsList) {
        clientsList.addEventListener('click', (e) => {
            const btn = e.target.closest('.client-btn');
            if (btn) {
                const clientId = btn.dataset.clientId;
                showClientDetails(clientId);
            }
        });
    }
    
    if (addClientBtnEmployee) {
        addClientBtnEmployee.addEventListener('click', () => {
            clientModalEmployee?.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeClientModalButtonEmployee) {
        closeClientModalButtonEmployee.addEventListener('click', closeClientModal);
    }
    
    if (cancelClientButtonEmployee) {
        cancelClientButtonEmployee.addEventListener('click', closeClientModal);
    }
    
    if (clientFormEmployee) {
        clientFormEmployee.addEventListener('submit', handleAddClient);
    }
}

export function renderClients(clients) {
    if (!clientsList) return;
    
    clientsList.innerHTML = clients.length > 0 ? clients.map(client => `
        <button data-client-id="${client.id}" class="client-btn w-full text-left bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50">
            <h3 class="font-bold text-gray-800">${client.first_name || ''} ${client.last_name || ''}</h3>
            <p class="text-sm text-gray-600">${client.phone || 'Sin teléfono'}</p>
            <p class="text-sm text-gray-500">${client.email || 'Sin email'}</p>
        </button>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron clientes.</p>`;
}

async function showClientDetails(clientId) {
    updateState('currentClientId', clientId);
    clientDetailsContent.innerHTML = '<p class="text-center text-gray-500 mt-8">Cargando detalles...</p>'; // Loading
    
    // 1. Obtener detalles completos usando la función del dashboard.api
    const details = await getClientDetails(clientId);

    if (!details || !details.profile) {
        clientDetailsContent.innerHTML = '<p class="text-center text-red-500 mt-8">Error al cargar detalles del cliente.</p>';
        return;
    }
    
    const clientData = details.profile;
    const appointments = details.appointments || [];
    const clientPets = details.pets || [];
    
    // 2. Usar los datos completos del perfil
    const fullName = clientData.first_name || clientData.last_name 
        ? `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() 
        : clientData.full_name;

    
    clientDetailsContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h3 class="text-xl font-bold text-gray-800 mb-4">${fullName}</h3>
            
            <div class="mb-6">
                <h4 class="text-lg font-semibold text-gray-700 mb-3">Información de Contacto</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm font-semibold text-gray-600">Email:</p>
                        <p class="text-gray-800">${clientData.email || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-600">Teléfono:</p>
                        <p class="text-blue-600"><a href="tel:${clientData.phone || ''}">${clientData.phone || 'N/A'}</a></p>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-600">Tipo de Doc.:</p>
                        <p class="text-gray-800">${clientData.doc_type || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-600">Nro. Doc.:</p>
                        <p class="text-gray-800">${clientData.doc_num || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-600">Distrito:</p>
                        <p class="text-gray-800">${clientData.district || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-600">Contacto Emergencia:</p>
                        <p class="text-gray-800">${clientData.emergency_contact_name || 'N/A'} ${clientData.emergency_contact_phone ? `(${clientData.emergency_contact_phone})` : ''}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h4 class="text-lg font-semibold text-gray-700 mb-3">Mascotas Registradas (${clientPets.length})</h4>
            <div class="space-y-3">
                ${clientPets.length > 0 ? clientPets.map(pet => {
                    const petImage = pet.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=A4D0A4&color=FFFFFF`;
                    return `
                        <div class="bg-gray-50 p-4 rounded-lg flex items-center space-x-4">
                            <img src="${petImage}" alt="${pet.name}" class="w-12 h-12 rounded-full object-cover border border-gray-300 flex-shrink-0">
                            <div>
                                <p class="font-bold text-gray-800">${pet.name}</p>
                                <p class="text-sm text-gray-600">${pet.breed || 'N/A'} | ${pet.sex || 'N/A'}</p>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="text-gray-500 text-sm">No tiene mascotas registradas</p>'}
            </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h4 class="text-lg font-semibold text-gray-700 mb-3">Historial de Citas (${appointments?.length || 0})</h4>
            <div class="space-y-3 max-h-96 overflow-y-auto">
                ${appointments && appointments.length > 0 ? appointments.map(apt => `
                    <div class="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-800">${apt.appointment_date} - ${apt.pets?.name || 'N/A'}</p>
                            <p class="text-sm text-gray-600">${apt.service || 'Sin servicio especificado'}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${
                            apt.status === 'completada' ? 'bg-green-100 text-green-700' :
                            apt.status === 'confirmada' ? 'bg-blue-100 text-blue-700' :
                            apt.status === 'cancelada' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }">${apt.status}</span>
                    </div>
                `).join('') : '<p class="text-gray-500 text-sm">No hay citas registradas</p>'}
            </div>
        </div>
        
        <div class="flex gap-3">
            <button class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                Editar Cliente
            </button>
            <button id="add-pet-to-client-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                + Agregar Mascota
            </button>
        </div>
    `;
    
    // 3. Ocultar lista y mostrar detalles
    clientsListView?.classList.add('hidden');
    clientDetailsView?.classList.remove('hidden');

    // 4. Configurar listener para el botón de "Agregar Mascota" en esta vista
    const addPetBtn = document.getElementById('add-pet-to-client-btn');
    addPetBtn?.addEventListener('click', () => {
        // Esto activará la lógica para abrir el modal de agregar mascota en employee-pets.js
        document.querySelector('#pets-view #add-pet-to-client-btn')?.click();
    });
}

function closeClientModal() {
    clientModalEmployee?.classList.add('hidden');
    document.body.style.overflow = '';
    clientFormEmployee?.reset();
    clientFormMessageEmployee?.classList.add('hidden');
}

async function handleAddClient(e) {
    e.preventDefault();
    
    const formData = new FormData(clientFormEmployee);
    const clientData = {
        email: formData.get('email'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        phone: formData.get('phone'),
        district: formData.get('district'),
        doc_type: formData.get('doc_type') || null,
        doc_num: formData.get('doc_num') || null
    };
    
    const result = await registerClientFromDashboard(clientData);
    
    if (result.success) {
        clientFormMessageEmployee.textContent = '✅ Cliente registrado con éxito';
        clientFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700';
        clientFormMessageEmployee.classList.remove('hidden');
        
        const clientsData = await getClientsWithPets();
        if (clientsData) {
            const allClients = clientsData.map(c => ({
                id: c.id,
                first_name: c.first_name,
                last_name: c.last_name,
                phone: c.phone,
                email: c.email,
                district: c.district
            }));
            updateState('allClients', allClients);
            updateState('clientsWithPets', clientsData);
            renderClients(allClients);
        }
        
        setTimeout(() => {
            closeClientModal();
        }, 1500);
    } else {
        clientFormMessageEmployee.textContent = `❌ ${result.error?.message || 'Error al registrar cliente'}`;
        clientFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        clientFormMessageEmployee.classList.remove('hidden');
    }
}
// public/modules/employee/employee-clients.js
// Módulo de gestión de clientes

import { state, updateState } from './employee-state.js';
import { registerClientFromDashboard, getClientsWithPets } from '../dashboard/dashboard.api.js';
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
}

export function setupClientListeners() {
    if (clientSearch) {
        clientSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = term ? state.allClients.filter(c =>
                `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term) ||
                (c.phone || '').includes(term)
            ) : state.allClients;
            renderClients(filtered);
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
    const clientData = state.clientsWithPets.find(c => c.id === clientId);
    
    if (!clientData) {
        console.error('Cliente no encontrado:', clientId);
        return;
    }
    
    // Obtener citas del cliente
    const { data: appointments } = await supabase
        .from('appointments')
        .select('*, pets(name)')
        .eq('user_id', clientId)
        .order('appointment_date', { ascending: false });
    
    const clientPets = clientData.pets || [];
    
    clientDetailsContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h3 class="text-xl font-bold text-gray-800 mb-4">${clientData.first_name || ''} ${clientData.last_name || ''}</h3>
            
            <div class="mb-6">
                <h4 class="text-lg font-semibold text-gray-700 mb-3">Información de Contacto</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm font-semibold text-gray-600">Email:</p>
                        <p class="text-gray-800">${clientData.email || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-600">Teléfono:</p>
                        <p class="text-blue-600"><a href="tel:${clientData.phone}">${clientData.phone || 'N/A'}</a></p>
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
                ${clientPets.length > 0 ? clientPets.map(pet => `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <p class="font-bold text-gray-800">${pet.name}</p>
                        <p class="text-sm text-gray-600">${pet.breed || 'N/A'} | ${pet.sex || 'N/A'}</p>
                    </div>
                `).join('') : '<p class="text-gray-500 text-sm">No tiene mascotas registradas</p>'}
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
    
    // Ocultar lista y mostrar detalles
    clientsListView?.classList.add('hidden');
    clientDetailsView?.classList.remove('hidden');
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
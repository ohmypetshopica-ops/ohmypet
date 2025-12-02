// public/modules/employee/employee-clients.js
// Módulo de gestión de clientes para EMPLEADOS

import { state, updateState } from './employee-state.js';
import { supabase } from '../../core/supabase.js';

// --- 1. IMPORTACIONES CORREGIDAS (Nuevas Rutas) ---
import { 
    registerClientFromDashboard, 
    getClientsWithPets, 
    getClientDetails, 
    updateClientProfile 
} from '../dashboard/clients.api.js';

import { addPetFromDashboard } from '../dashboard/pets.api.js';
// --------------------------------------------------

// --- UTILITY: LIMPIEZA DE NÚMEROS DE TELÉFONO ---
const cleanPhoneNumber = (rawNumber) => {
    if (!rawNumber) return null;
    let cleaned = rawNumber.replace(/[^\d+]/g, '');
    if (cleaned.length < 9 || (cleaned.length > 9 && !cleaned.startsWith('+'))) {
        let digitsOnly = cleaned.replace(/\D/g, '');
        if (digitsOnly.length === 9) return digitsOnly;
        return null;
    }
    return cleaned;
};

// Elementos del DOM
let clientSearch;
let clientsList;
let clientsListView;
let clientDetailsView;
let clientDetailsContentView;
let clientDetailsContentEdit;
let backToClientsBtn;
let addClientBtnEmployee;
let clientModalEmployee;
let submitAddClientButtonEmployee;
let cancelClientButtonEmployee;
let clientFormEmployee;
let clientFormMessageEmployee;
let clearSearchBtn;
let addPetBtn;
let editClientBtn;
let saveClientBtn;
let cancelEditClientBtn;
let clientEditForm;
let editFormMessage;
let clientDetailsActions;
let paginationContainer;

// Elementos del Modal Agregar Mascota
let addPetModalEmployee;
let petFormEmployee;
let petFormMessageEmployee;
let cancelAddPetButtonEmployee;
let submitAddPetButtonEmployee; 

let currentClientProfile = null;

// Variables de paginación
let currentPage = 1;
const itemsPerPage = 8;

export function initClientElements() {
    clientSearch = document.getElementById('client-search');
    clientsList = document.getElementById('clients-list');
    clientsListView = document.getElementById('clients-list-view');
    clientDetailsView = document.getElementById('client-details-view');
    clientDetailsContentView = document.getElementById('client-details-content-view');
    clientDetailsContentEdit = document.getElementById('client-details-content-edit');
    backToClientsBtn = document.getElementById('back-to-clients-btn');

    addClientBtnEmployee = document.querySelector('#add-client-btn-employee');
    clientModalEmployee = document.querySelector('#client-modal-employee');
    submitAddClientButtonEmployee = document.querySelector('#submit-add-client-button-employee'); 
    cancelClientButtonEmployee = document.querySelector('#cancel-client-button-employee');
    clientFormEmployee = document.querySelector('#client-form-employee');
    clientFormMessageEmployee = document.querySelector('#client-form-message-employee');

    clearSearchBtn = document.getElementById('clear-client-search-btn');
    
    paginationContainer = document.getElementById('pagination-container');

    clientDetailsActions = document.getElementById('client-details-actions');
    
    // Botón para agregar mascota dentro del detalle del cliente
    addPetBtn = document.getElementById('add-pet-to-client-btn');

    editClientBtn = document.getElementById('edit-client-btn');
    saveClientBtn = document.getElementById('save-client-btn');
    cancelEditClientBtn = document.getElementById('cancel-edit-client-btn');
    clientEditForm = document.getElementById('client-edit-form');
    editFormMessage = document.getElementById('edit-form-message');

    addPetModalEmployee = document.querySelector('#add-pet-modal-employee');
    petFormEmployee = document.querySelector('#pet-form-employee');
    petFormMessageEmployee = document.querySelector('#pet-form-message-employee');
    cancelAddPetButtonEmployee = document.querySelector('#cancel-add-pet-button-employee');
    submitAddPetButtonEmployee = document.querySelector('#submit-add-pet-button-employee');
}

export function setupClientListeners() {
    clientSearch?.addEventListener('input', handleSearch);
    clearSearchBtn?.addEventListener('click', () => {
        currentPage = 1;
        clientSearch.value = '';
        clearSearchBtn.classList.add('hidden');
        handleSearch({ target: clientSearch });
    });

    backToClientsBtn?.addEventListener('click', showClientsList);

    clientsList?.addEventListener('click', (e) => {
        const clientBtn = e.target.closest('.client-btn');
        if (clientBtn) showClientDetails(clientBtn.dataset.clientId);
    });

    addClientBtnEmployee?.addEventListener('click', () => openClientModal());
    cancelClientButtonEmployee?.addEventListener('click', closeClientModal);
    
    // Manejo del formulario de cliente (Submit)
    clientFormEmployee?.addEventListener('submit', handleAddClient);

    editClientBtn?.addEventListener('click', switchToEditMode);
    cancelEditClientBtn?.addEventListener('click', switchToViewMode);
    saveClientBtn?.addEventListener('click', handleSaveClient);

    addPetBtn?.addEventListener('click', openAddPetModal);
    
    cancelAddPetButtonEmployee?.addEventListener('click', closeAddPetModal);
    
    // Manejo del formulario de mascota (Submit)
    petFormEmployee?.addEventListener('submit', handleAddPetToClient);
}

const handleSearch = (e) => {
    currentPage = 1;
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
};

// ====== FUNCIÓN DE PAGINACIÓN ======
const renderPagination = (totalItems) => {
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2">';

    // Botón Anterior
    const prevDisabled = currentPage === 1;
    paginationHTML += `
        <button data-page="${currentPage - 1}" 
                class="px-3 py-2 border rounded-lg transition-colors ${prevDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}" 
                ${prevDisabled ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
        </button>
    `;

    // Números de página
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage 
            ? 'bg-green-600 text-white' 
            : 'bg-white hover:bg-gray-50 text-gray-700';
        paginationHTML += `
            <button data-page="${i}" 
                    class="w-10 h-10 border rounded-lg font-medium transition-colors ${activeClass}">
                ${i}
            </button>
        `;
    }

    // Botón Siguiente
    const nextDisabled = currentPage === totalPages;
    paginationHTML += `
        <button data-page="${currentPage + 1}" 
                class="px-3 py-2 border rounded-lg transition-colors ${nextDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}" 
                ${nextDisabled ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        </button>
    `;

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    // Event listeners
    paginationContainer.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const newPage = parseInt(button.dataset.page);
            if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                const searchTerm = clientSearch.value.toLowerCase();
                const filtered = searchTerm ? state.allClients.filter(c =>
                    `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(searchTerm) ||
                    (c.phone || '').includes(searchTerm)
                ) : state.allClients;
                renderClients(filtered);
            }
        });
    });
};

export function renderClients(clients) {
    if (!clientsList) return;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = clients.slice(startIndex, endIndex);

    clientsList.innerHTML = paginatedClients.length > 0 ? paginatedClients.map(client => `
        <button data-client-id="${client.id}" class="client-btn w-full text-left bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50">
            <h3 class="font-bold text-gray-800">${client.first_name || ''} ${client.last_name || ''}</h3>
            <p class="text-sm text-gray-600">${client.phone || 'Sin teléfono'}</p>
            <p class="text-sm text-gray-500">${client.email || 'Sin email'}</p>
        </button>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron clientes.</p>`;

    renderPagination(clients.length);
}

async function showClientDetails(clientId) {
    updateState('currentClientId', clientId);
    clientDetailsContentView.innerHTML = '<p class="text-center text-gray-500 mt-8">Cargando detalles...</p>';
    clientsListView?.classList.add('hidden');
    clientDetailsView?.classList.remove('hidden');
    clientDetailsContentEdit?.classList.add('hidden'); 

    const details = await getClientDetails(clientId);
    currentClientProfile = details; 

    if (!details || !details.profile) {
        clientDetailsContentView.innerHTML = '<p class="text-center text-red-500 mt-8">Error al cargar detalles.</p>';
        return;
    }
    renderClientDetailsView(details); 
    switchToViewMode();
}

const renderClientDetailsView = (details) => {
     const clientData = details.profile;
     const appointments = details.appointments || [];
     const clientPets = details.pets || [];
     const fullName = clientData.first_name || clientData.last_name
         ? `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim()
         : clientData.full_name || 'Sin nombre';
    
    const lastAppointment = appointments.length > 0 ? appointments[0] : null;
    const lastApptDisplay = lastAppointment 
        ? `${lastAppointment.appointment_date} (${lastAppointment.appointment_time.slice(0, 5)})`
        : 'Sin citas previas';

    const petsHTML = clientPets.length > 0
        ? clientPets.map(pet => {
            const petImage = pet.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=10B981&color=FFFFFF`;
            return `
                <div class="bg-white p-3 rounded-lg shadow-sm border flex items-center space-x-3">
                    <img src="${petImage}" alt="${pet.name}" class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <p class="font-bold text-gray-800">${pet.name}</p>
                        <p class="text-xs text-gray-600">${pet.breed || 'Raza no especificada'}</p>
                    </div>
                </div>
            `;
        }).join('')
        : '<p class="text-sm text-gray-500">No hay mascotas registradas.</p>';

    clientDetailsContentView.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div class="border-b pb-4">
                <h3 class="text-2xl font-bold text-gray-900">${fullName}</h3>
                <p class="text-sm text-gray-600">${clientData.email || 'Sin email'}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Teléfono</p>
                    <p class="font-bold text-gray-800">${clientData.phone || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Distrito</p>
                    <p class="font-bold text-gray-800">${clientData.district || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Tipo Doc.</p>
                    <p class="font-bold text-gray-800">${clientData.doc_type || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Número Doc.</p>
                    <p class="font-bold text-gray-800">${clientData.doc_num || 'N/A'}</p>
                </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h4 class="text-lg font-semibold text-blue-800 mb-2">Última Cita</h4>
                <p class="text-sm text-gray-800">${lastApptDisplay}</p>
            </div>

            <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3">Mascotas (${clientPets.length})</h4>
                <div class="space-y-2">${petsHTML}</div>
            </div>
        </div>
    `;
};

const renderClientDetailsEdit = (clientData) => {
    if (!clientEditForm) return;
    
    document.getElementById('edit-first-name').value = clientData.first_name || '';
    document.getElementById('edit-last-name').value = clientData.last_name || '';
    document.getElementById('edit-phone').value = clientData.phone || '';
    document.getElementById('edit-district').value = clientData.district || '';
    document.getElementById('edit-doc-type').value = clientData.doc_type || 'DNI';
    document.getElementById('edit-doc-num').value = clientData.doc_num || '';
    document.getElementById('edit-emergency-name').value = clientData.emergency_contact_name || '';
    document.getElementById('edit-emergency-phone').value = clientData.emergency_contact_phone || '';
};

const switchToViewMode = () => {
    clientDetailsContentView?.classList.remove('hidden');
    clientDetailsContentEdit?.classList.add('hidden');
    clientDetailsActions?.classList.remove('hidden');
    editFormMessage?.classList.add('hidden');
};

const switchToEditMode = () => {
    if (!currentClientProfile?.profile) return;
    clientDetailsContentView?.classList.add('hidden');
    clientDetailsContentEdit?.classList.remove('hidden');
    clientDetailsActions?.classList.add('hidden');
    renderClientDetailsEdit(currentClientProfile.profile);
};

const showClientsList = () => {
    clientsListView?.classList.remove('hidden');
    clientDetailsView?.classList.add('hidden');
    currentClientProfile = null;
    updateState('currentClientId', null);
};

const openClientModal = () => {
    clientModalEmployee?.classList.remove('hidden');
    clientFormEmployee?.reset();
    clientFormMessageEmployee?.classList.add('hidden');
};

const closeClientModal = () => {
    clientModalEmployee?.classList.add('hidden');
    clientFormEmployee?.reset();
    clientFormMessageEmployee?.classList.add('hidden');
};

const handleAddClient = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(clientFormEmployee);
    const firstName = formData.get('first_name')?.trim();
    const lastName = formData.get('last_name')?.trim();
    const email = formData.get('email')?.trim();
    const phone = formData.get('phone')?.trim();
    const district = formData.get('district')?.trim();
    const docType = formData.get('doc_type')?.trim();
    const docNum = formData.get('doc_num')?.trim();
    // Empleados no registran contraseña usualmente, se asume null o valor por defecto si se requiere
    const password = null; 
    const emergencyName = formData.get('emergency_contact_name')?.trim();
    const emergencyPhone = formData.get('emergency_contact_phone')?.trim();

    if (!firstName || !phone || !district) {
        clientFormMessageEmployee.textContent = '❌ Por favor, completa los campos obligatorios (Nombre, Teléfono, Distrito).';
        clientFormMessageEmployee.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        clientFormMessageEmployee.classList.remove('hidden');
        return;
    }

    const cleanedPhone = cleanPhoneNumber(phone);
    if (!cleanedPhone) {
        clientFormMessageEmployee.textContent = '❌ El teléfono debe tener al menos 9 dígitos.';
        clientFormMessageEmployee.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        clientFormMessageEmployee.classList.remove('hidden');
        return;
    }

    submitAddClientButtonEmployee.disabled = true;
    submitAddClientButtonEmployee.textContent = 'Registrando...';

    try {
        // Se usa la misma función del admin
        const result = await registerClientFromDashboard({
            email, password, firstName, lastName, phone: cleanedPhone, district, docType, docNum, emergencyContactName: emergencyName, emergencyContactPhone: emergencyPhone
        });

        if (result.success) {
            clientFormMessageEmployee.textContent = '✅ Cliente registrado exitosamente.';
            clientFormMessageEmployee.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
            clientFormMessageEmployee.classList.remove('hidden');

            setTimeout(async () => {
                closeClientModal();
                // Recargar datos locales del empleado
                const clientsData = await getClientsWithPets();
                updateState('clientsWithPets', clientsData);
                const allClients = clientsData.map(c => ({
                    id: c.id, first_name: c.first_name, last_name: c.last_name, 
                    phone: c.phone, email: c.email, district: c.district
                }));
                updateState('allClients', allClients);
                currentPage = 1;
                renderClients(allClients);
            }, 1500);
        } else {
            clientFormMessageEmployee.textContent = `❌ Error: ${result.error?.message || 'Error desconocido'}`;
            clientFormMessageEmployee.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
            clientFormMessageEmployee.classList.remove('hidden');
        }
    } catch (error) {
        clientFormMessageEmployee.textContent = `❌ Error: ${error.message || 'Error desconocido'}`;
        clientFormMessageEmployee.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        clientFormMessageEmployee.classList.remove('hidden');
    } finally {
        submitAddClientButtonEmployee.disabled = false;
        submitAddClientButtonEmployee.textContent = 'Guardar Cliente';
    }
};

const handleSaveClient = async (e) => {
    e.preventDefault();

    if (!currentClientProfile?.profile?.id) return;

    const formData = new FormData(clientEditForm);
    const updates = {
        first_name: formData.get('first_name')?.trim(),
        last_name: formData.get('last_name')?.trim(),
        phone: formData.get('phone')?.trim(),
        district: formData.get('district')?.trim(),
        doc_type: formData.get('doc_type')?.trim(),
        doc_num: formData.get('doc_num')?.trim(),
        emergency_contact_name: formData.get('emergency_contact_name')?.trim(),
        emergency_contact_phone: formData.get('emergency_contact_phone')?.trim(),
    };

    if (updates.phone) {
        const cleanedPhone = cleanPhoneNumber(updates.phone);
        if (!cleanedPhone) {
            editFormMessage.textContent = '❌ El teléfono debe tener al menos 9 dígitos.';
            editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
            editFormMessage.classList.remove('hidden');
            return;
        }
        updates.phone = cleanedPhone;
    }

    saveClientBtn.disabled = true;
    saveClientBtn.textContent = 'Guardando...';

    const result = await updateClientProfile(currentClientProfile.profile.id, updates);

    if (result.success) {
        editFormMessage.textContent = '✅ Cliente actualizado correctamente.';
        editFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');

        setTimeout(async () => {
            switchToViewMode();
            // Actualizar lista global en segundo plano
            const clientsData = await getClientsWithPets();
            updateState('clientsWithPets', clientsData);
            const allClients = clientsData.map(c => ({
                id: c.id, first_name: c.first_name, last_name: c.last_name, 
                phone: c.phone, email: c.email, district: c.district
            }));
            updateState('allClients', allClients);
            renderClients(allClients);
            // Recargar detalles
            showClientDetails(currentClientProfile.profile.id);
        }, 1000);

    } else {
        editFormMessage.textContent = `❌ Error: ${result.error?.message || 'Error desconocido'}`;
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
    }

    saveClientBtn.disabled = false;
    saveClientBtn.textContent = 'Guardar Cambios';
};

const openAddPetModal = () => {
    if (!currentClientProfile?.profile?.id) {
        alert('No se puede agregar mascota sin un cliente válido.');
        return;
    }
    addPetModalEmployee?.classList.remove('hidden');
    petFormEmployee?.reset();
    petFormMessageEmployee?.classList.add('hidden');
};

const closeAddPetModal = () => {
    addPetModalEmployee?.classList.add('hidden');
    petFormEmployee?.reset();
    petFormMessageEmployee?.classList.add('hidden');
};

const handleAddPetToClient = async (e) => {
    e.preventDefault();

    if (!currentClientProfile?.profile?.id) {
        alert('No hay un cliente seleccionado.');
        return;
    }

    const formData = new FormData(petFormEmployee);
    const petData = {
        name: formData.get('name')?.trim(),
        breed: formData.get('breed')?.trim(),
        sex: formData.get('sex')?.trim(),
        weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
        size: formData.get('size')?.trim(),
        observations: formData.get('observations')?.trim(),
        owner_id: currentClientProfile.profile.id
    };

    if (!petData.name || !petData.breed || !petData.sex) {
        petFormMessageEmployee.textContent = '❌ Por favor, completa todos los campos obligatorios.';
        petFormMessageEmployee.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        petFormMessageEmployee.classList.remove('hidden');
        return;
    }

    submitAddPetButtonEmployee.disabled = true;
    submitAddPetButtonEmployee.textContent = 'Guardando...';

    try {
        const result = await addPetFromDashboard(petData);

        if (result.success) {
            petFormMessageEmployee.textContent = '✅ Mascota agregada correctamente.';
            petFormMessageEmployee.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
            petFormMessageEmployee.classList.remove('hidden');

            setTimeout(async () => {
                closeAddPetModal();
                const updatedDetails = await getClientDetails(currentClientProfile.profile.id);
                currentClientProfile = updatedDetails;
                renderClientDetailsView(updatedDetails);
            }, 1500);
        } else {
            petFormMessageEmployee.textContent = `❌ Error: ${result.error?.message || 'Error desconocido'}`;
            petFormMessageEmployee.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
            petFormMessageEmployee.classList.remove('hidden');
        }
    } catch (error) {
        petFormMessageEmployee.textContent = `❌ Error: ${error.message || 'Error desconocido'}`;
        petFormMessageEmployee.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        petFormMessageEmployee.classList.remove('hidden');
    } finally {
        submitAddPetButtonEmployee.disabled = false;
        submitAddPetButtonEmployee.textContent = 'Guardar Mascota';
    }
};
// public/modules/employee/employee-clients.js
// Módulo de gestión de clientes

import { state, updateState } from './employee-state.js';
import { registerClientFromDashboard, getClientsWithPets, getClientDetails, updateClientProfile, addPetFromDashboard } from '../dashboard/dashboard.api.js'; // Importar addPetFromDashboard
import { supabase } from '../../core/supabase.js';

// --- UTILITY: LIMPIEZA DE NÚMEROS DE TELÉFONO ---
const cleanPhoneNumber = (rawNumber) => {
    // ... (código sin cambios)
    if (!rawNumber) return null;
    let cleaned = rawNumber.replace(/[^\d+]/g, '');
    if (cleaned.length < 9 || (cleaned.length > 9 && !cleaned.startsWith('+'))) {
        let digitsOnly = cleaned.replace(/\D/g, '');
        if (digitsOnly.length === 9) return digitsOnly;
        return null;
    }
    return cleaned;
};
// --- FIN UTILITY ---

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
let submitAddClientButtonEmployee; // Renombrado para claridad
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

// Elementos del Modal Agregar Mascota
let addPetModalEmployee;
let petFormEmployee;
let petFormMessageEmployee;
let cancelAddPetButtonEmployee;
let submitAddPetButtonEmployee; // Nuevo selector para el botón submit del modal mascota

// Variable para guardar el perfil actual en modo edición/vista
let currentClientProfile = null;

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
    submitAddClientButtonEmployee = document.querySelector('#submit-add-client-button-employee'); // ID correcto
    cancelClientButtonEmployee = document.querySelector('#cancel-client-button-employee');
    clientFormEmployee = document.querySelector('#client-form-employee');
    clientFormMessageEmployee = document.querySelector('#client-form-message-employee');

    clearSearchBtn = document.getElementById('clear-search-btn');
    addPetBtn = document.getElementById('add-pet-to-client-btn');
    editClientBtn = document.getElementById('edit-client-btn');
    saveClientBtn = document.getElementById('save-client-btn');
    cancelEditClientBtn = document.getElementById('cancel-edit-client-btn');
    clientEditForm = document.getElementById('client-edit-form');
    editFormMessage = document.getElementById('edit-form-message');
    clientDetailsActions = document.getElementById('client-details-actions');

    // Inicializar elementos del modal de mascota
    addPetModalEmployee = document.querySelector('#add-pet-modal-employee');
    petFormEmployee = document.querySelector('#pet-form-employee');
    petFormMessageEmployee = document.querySelector('#pet-form-message-employee');
    cancelAddPetButtonEmployee = document.querySelector('#cancel-add-pet-button-employee');
    submitAddPetButtonEmployee = document.querySelector('#submit-add-pet-button-employee'); // Selector para botón submit mascota
}

export function setupClientListeners() {
    if (clientSearch) {
        // ... (listener de búsqueda sin cambios)
        clientSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            clearSearchBtn?.classList.toggle('hidden', term.length === 0);
            const filtered = term ? state.allClients.filter(c =>
                `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term) ||
                (c.phone || '').includes(term)
            ) : state.allClients;
            renderClients(filtered);
        });
    }

    if (clearSearchBtn) {
       // ... (listener de limpiar búsqueda sin cambios)
        clearSearchBtn.addEventListener('click', () => {
            clientSearch.value = '';
            clearSearchBtn.classList.add('hidden');
            renderClients(state.allClients);
        });
    }

    if (backToClientsBtn) {
        // ... (listener de volver a lista sin cambios)
        backToClientsBtn.addEventListener('click', () => {
            switchToListView();
        });
    }

    if (clientsList) {
       // ... (listener de click en lista sin cambios)
        clientsList.addEventListener('click', (e) => {
            const btn = e.target.closest('.client-btn');
            if (btn) showClientDetails(btn.dataset.clientId);
        });
    }

    // Modal Agregar Cliente
    if (addClientBtnEmployee) addClientBtnEmployee.addEventListener('click', openClientModal);
    if (cancelClientButtonEmployee) cancelClientButtonEmployee.addEventListener('click', closeClientModal);
    if (clientFormEmployee) clientFormEmployee.addEventListener('submit', handleAddClient);

    // Listeners para Edición de Cliente
    if (editClientBtn) editClientBtn.addEventListener('click', switchToEditMode);
    if (saveClientBtn) saveClientBtn.addEventListener('click', handleSaveClient);
    if (cancelEditClientBtn) cancelEditClientBtn.addEventListener('click', switchToViewMode);

    // --- Listener para abrir Modal Agregar Mascota ---
    if (addPetBtn) addPetBtn.addEventListener('click', openAddPetModal);

    // --- Listeners para Modal Agregar Mascota ---
    if (cancelAddPetButtonEmployee) cancelAddPetButtonEmployee.addEventListener('click', closeAddPetModal);
    if (petFormEmployee) petFormEmployee.addEventListener('submit', handleAddPet); // Reutiliza handleAddPet para el submit
     // Cerrar modal si se hace click fuera (para ambos modales)
     if (clientModalEmployee) clientModalEmployee.addEventListener('click', (e) => { if (e.target === clientModalEmployee) closeClientModal(); });
     if (addPetModalEmployee) addPetModalEmployee.addEventListener('click', (e) => { if (e.target === addPetModalEmployee) closeAddPetModal(); });
}

// --- Funciones de Modales ---
const openClientModal = () => {
    clientModalEmployee?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};
const closeClientModal = () => {
    clientModalEmployee?.classList.add('hidden');
    document.body.style.overflow = '';
    clientFormEmployee?.reset();
    clientFormMessageEmployee?.classList.add('hidden');
};

const openAddPetModal = () => {
    if (addPetModalEmployee && state.currentClientId) {
        const ownerIdInput = document.getElementById('pet-owner-id-employee');
        ownerIdInput.value = state.currentClientId; // Asignar ID
        petFormEmployee?.reset(); // Limpiar formulario
        petFormMessageEmployee?.classList.add('hidden'); // Ocultar mensajes
        addPetModalEmployee.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        console.error("Error al abrir modal mascota: Modal no encontrado o ID de cliente no definido.");
        alert("No se puede agregar mascota en este momento.");
    }
};
const closeAddPetModal = () => {
    addPetModalEmployee?.classList.add('hidden');
    document.body.style.overflow = '';
    // No reseteamos el form aquí para que los datos persistan si se cierra por error
};
// --- Fin Funciones de Modales ---

// --- Funciones de cambio de vista (sin cambios) ---
const switchToListView = () => {
    clientsListView?.classList.remove('hidden');
    clientDetailsView?.classList.add('hidden');
    clientDetailsContentEdit?.classList.add('hidden');
    updateState('currentClientId', null);
    currentClientProfile = null;
};
const switchToViewMode = () => {
    clientDetailsContentView?.classList.remove('hidden');
    clientDetailsContentEdit?.classList.add('hidden');
    clientDetailsActions?.classList.remove('hidden');
    editFormMessage?.classList.add('hidden');
    if (currentClientProfile) renderClientDetailsView(currentClientProfile);
};
const switchToEditMode = () => {
    if (!currentClientProfile) return;
    clientDetailsContentView?.classList.add('hidden');
    clientDetailsContentEdit?.classList.remove('hidden');
    clientDetailsActions?.classList.add('hidden');
    renderEditForm(currentClientProfile.profile);
};
// --- Fin funciones de cambio de vista ---

// --- Renderizado y Lógica de Datos (con modificaciones para agregar mascota) ---
const renderEditForm = (profile) => {
    // ... (código sin cambios)
    if (!clientEditForm) return;
    clientEditForm.querySelector('#edit-client-id').value = profile.id;
    clientEditForm.querySelector('#edit-first-name').value = profile.first_name || '';
    clientEditForm.querySelector('#edit-last-name').value = profile.last_name || '';
    clientEditForm.querySelector('#edit-email').value = profile.email || 'N/A'; // Email no editable
    clientEditForm.querySelector('#edit-phone').value = profile.phone || '';
    clientEditForm.querySelector('#edit-district').value = profile.district || '';
    clientEditForm.querySelector('#edit-doc-type').value = profile.doc_type || '';
    clientEditForm.querySelector('#edit-doc-num').value = profile.doc_num || '';
    clientEditForm.querySelector('#edit-emergency-name').value = profile.emergency_contact_name || '';
    clientEditForm.querySelector('#edit-emergency-phone').value = profile.emergency_contact_phone || '';
};

const handleSaveClient = async () => {
    // ... (código sin cambios)
    if (!clientEditForm) return;

    const formData = new FormData(clientEditForm);
    const clientId = formData.get('id');

    // Limpiar números de teléfono
    const phoneRaw = formData.get('phone');
    const emergencyPhoneRaw = formData.get('emergency_contact_phone');
    const phoneCleaned = cleanPhoneNumber(phoneRaw);
    const emergencyPhoneCleaned = cleanPhoneNumber(emergencyPhoneRaw);

    const updatedData = {
        first_name: formData.get('first_name').trim(),
        last_name: formData.get('last_name').trim(),
        full_name: `${formData.get('first_name').trim()} ${formData.get('last_name').trim()}`,
        phone: phoneCleaned, // Guardar limpio
        doc_type: formData.get('doc_type') || null,
        doc_num: formData.get('doc_num').trim() || null,
        district: formData.get('district').trim() || null,
        emergency_contact_name: formData.get('emergency_contact_name').trim() || null,
        emergency_contact_phone: emergencyPhoneCleaned, // Guardar limpio
    };

    // Validaciones básicas
    if (!updatedData.first_name || !updatedData.last_name) {
        editFormMessage.textContent = '⚠️ Nombre y Apellido son obligatorios.';
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
        return;
    }
    if (phoneRaw && phoneCleaned === null) {
        editFormMessage.textContent = '⚠️ Teléfono principal inválido (9 dígitos o formato internacional).';
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
        return;
    }
    if (emergencyPhoneRaw && emergencyPhoneCleaned === null) {
         editFormMessage.textContent = '⚠️ Teléfono de emergencia inválido (9 dígitos o formato internacional).';
         editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
         editFormMessage.classList.remove('hidden');
         return;
     }

    saveClientBtn.disabled = true;
    saveClientBtn.textContent = 'Guardando...';
    editFormMessage.classList.add('hidden');

    const result = await updateClientProfile(clientId, updatedData);

    if (result.success) {
        // Actualizar caché local y estado
        const updatedProfileData = result.data;
        currentClientProfile.profile = { ...currentClientProfile.profile, ...updatedProfileData }; // Actualiza caché
        // Actualizar también en la lista general del estado
        const clientIndex = state.allClients.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            state.allClients[clientIndex] = { ...state.allClients[clientIndex], ...updatedProfileData };
        }

        editFormMessage.textContent = '✅ Cliente actualizado con éxito.';
        editFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');

        // Volver a la vista después de 1 segundo
        setTimeout(() => {
            switchToViewMode();
            renderClients(state.allClients); // Re-renderizar lista principal por si cambió el nombre
        }, 1000);

    } else {
        editFormMessage.textContent = `❌ Error: ${result.error?.message || 'Error desconocido'}`;
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
    }

    saveClientBtn.disabled = false;
    saveClientBtn.textContent = 'Guardar Cambios';
};

export function renderClients(clients) {
    // ... (código sin cambios)
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
    // ... (código sin cambios)
    updateState('currentClientId', clientId);
    clientDetailsContentView.innerHTML = '<p class="text-center text-gray-500 mt-8">Cargando detalles...</p>';
    clientsListView?.classList.add('hidden');
    clientDetailsView?.classList.remove('hidden');
    clientDetailsContentEdit?.classList.add('hidden'); // Asegurar que el form esté oculto

    const details = await getClientDetails(clientId);
    currentClientProfile = details; // Guardar en caché

    if (!details || !details.profile) {
        clientDetailsContentView.innerHTML = '<p class="text-center text-red-500 mt-8">Error al cargar detalles.</p>';
        return;
    }
    renderClientDetailsView(details); // Renderizar la vista
    switchToViewMode(); // Asegurar que estamos en modo vista
}

// Función separada para renderizar la vista de detalles
const renderClientDetailsView = (details) => {
     // ... (código sin cambios)
     const clientData = details.profile;
     const appointments = details.appointments || [];
     const clientPets = details.pets || [];
     const fullName = clientData.first_name || clientData.last_name
         ? `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim()
         : clientData.full_name;

     clientDetailsContentView.innerHTML = `
         <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
             <h3 class="text-xl font-bold text-gray-800 mb-4">${fullName}</h3>
             <div class="mb-6">
                 <h4 class="text-lg font-semibold text-gray-700 mb-3">Información de Contacto</h4>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                     <div><p class="font-semibold text-gray-600">Email:</p><p>${clientData.email || 'N/A'}</p></div>
                     <div><p class="font-semibold text-gray-600">Teléfono:</p><p><a href="tel:${clientData.phone || ''}" class="text-blue-600">${clientData.phone || 'N/A'}</a></p></div>
                     <div><p class="font-semibold text-gray-600">Tipo Doc.:</p><p>${clientData.doc_type || 'N/A'}</p></div>
                     <div><p class="font-semibold text-gray-600">Nro Doc.:</p><p>${clientData.doc_num || 'N/A'}</p></div>
                     <div><p class="font-semibold text-gray-600">Distrito:</p><p>${clientData.district || 'N/A'}</p></div>
                     <div><p class="font-semibold text-gray-600">Contacto Emerg.:</p><p>${clientData.emergency_contact_name || 'N/A'} ${clientData.emergency_contact_phone ? `(${clientData.emergency_contact_phone})` : ''}</p></div>
                 </div>
             </div>
         </div>
         <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
             <h4 class="text-lg font-semibold text-gray-700 mb-3">Mascotas (${clientPets.length})</h4>
             <div class="space-y-3" id="client-pet-list"> ${clientPets.length > 0 ? clientPets.map(pet => {
                     const petImage = pet.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=A4D0A4&color=FFFFFF`;
                     return `<div class="bg-gray-50 p-4 rounded-lg flex items-center space-x-4"><img src="${petImage}" alt="${pet.name}" class="w-12 h-12 rounded-full object-cover border"><p class="font-bold">${pet.name}</p><p class="text-sm text-gray-600">${pet.breed || 'N/A'} | ${pet.sex || 'N/A'}</p></div>`;
                 }).join('') : '<p class="text-gray-500 text-sm">No tiene mascotas</p>'}
             </div>
         </div>
         <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
             <h4 class="text-lg font-semibold text-gray-700 mb-3">Historial (${appointments?.length || 0})</h4>
             <div class="space-y-3 max-h-60 overflow-y-auto">
                 ${appointments && appointments.length > 0 ? appointments.map(apt => {
                     const statusClass = apt.status === 'completada' ? 'bg-green-100 text-green-700' : apt.status === 'confirmada' ? 'bg-blue-100 text-blue-700' : apt.status === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                     return `<div class="bg-gray-50 p-4 rounded-lg flex justify-between items-center"><p class="font-semibold">${apt.appointment_date} - ${apt.pets?.name || 'N/A'}</p><span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">${apt.status}</span></div>`;
                 }).join('') : '<p class="text-gray-500 text-sm">No hay citas</p>'}
             </div>
         </div>
     `;
};


async function handleAddClient(e) {
    // ... (código sin cambios)
    e.preventDefault();

    const formData = new FormData(clientFormEmployee);
    // Limpiar teléfonos ANTES de enviarlos
    const phoneCleaned = cleanPhoneNumber(formData.get('phone'));

    const clientData = {
        email: formData.get('email'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        phone: phoneCleaned, // Usar limpio
        district: formData.get('district'),
        doc_type: formData.get('doc_type') || null,
        doc_num: formData.get('doc_num') || null
    };

    // Validar teléfono limpio
     if (!clientData.phone) {
         clientFormMessageEmployee.textContent = '❌ Teléfono inválido (9 dígitos o formato internacional).';
         clientFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
         clientFormMessageEmployee.classList.remove('hidden');
         return;
     }

    const result = await registerClientFromDashboard(clientData);

    if (result.success) {
        clientFormMessageEmployee.textContent = '✅ Cliente registrado con éxito';
        clientFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700';
        clientFormMessageEmployee.classList.remove('hidden');

        // Recargar datos actualizados
        const clientsData = await getClientsWithPets();
        if (clientsData) {
            const allClients = clientsData.map(c => ({
                id: c.id, first_name: c.first_name, last_name: c.last_name, phone: c.phone, email: c.email, district: c.district
            }));
            updateState('allClients', allClients);
            updateState('clientsWithPets', clientsData);
            renderClients(allClients); // Re-renderizar lista
        }

        setTimeout(closeClientModal, 1500);
    } else {
        clientFormMessageEmployee.textContent = `❌ ${result.error?.message || 'Error al registrar cliente'}`;
        clientFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        clientFormMessageEmployee.classList.remove('hidden');
    }
}

// --- Nueva función para manejar el submit del modal de mascota ---
async function handleAddPet(e) {
    e.preventDefault();

    if (!state.currentClientId) {
        petFormMessageEmployee.textContent = '❌ Error: No se ha identificado al dueño.';
        petFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        petFormMessageEmployee.classList.remove('hidden');
        return;
    }

    const formData = new FormData(petFormEmployee);
    const petData = {
        owner_id: state.currentClientId, // Usar el ID del estado
        name: formData.get('name').trim(),
        breed: formData.get('breed').trim(),
        size: formData.get('size'),
        weight: parseFloat(formData.get('weight')) || null,
        sex: formData.get('sex'),
        observations: formData.get('observations').trim() || null
    };

    // Validación básica
    if (!petData.name) {
         petFormMessageEmployee.textContent = '❌ El nombre de la mascota es obligatorio.';
         petFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
         petFormMessageEmployee.classList.remove('hidden');
         return;
     }

    submitAddPetButtonEmployee.disabled = true;
    submitAddPetButtonEmployee.textContent = 'Guardando...';
    petFormMessageEmployee.classList.add('hidden');

    const result = await addPetFromDashboard(petData);

    if (result.success) {
        petFormMessageEmployee.textContent = '✅ Mascota registrada con éxito.';
        petFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700';
        petFormMessageEmployee.classList.remove('hidden');

        // Recargar detalles del cliente para mostrar la nueva mascota
        const updatedDetails = await getClientDetails(state.currentClientId);
        if (updatedDetails) {
            currentClientProfile = updatedDetails; // Actualizar caché
            renderClientDetailsView(updatedDetails); // Actualizar la vista de detalles
        }
        // También actualizar el estado global de mascotas
        const { data: pets } = await supabase.from('pets').select('*').order('created_at', { ascending: false });
        if (pets) updateState('allPets', pets);


        setTimeout(() => {
            closeAddPetModal();
        }, 1500);
    } else {
        petFormMessageEmployee.textContent = `❌ ${result.error?.message || 'Error al registrar mascota'}`;
        petFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        petFormMessageEmployee.classList.remove('hidden');
    }

    submitAddPetButtonEmployee.disabled = false;
    submitAddPetButtonEmployee.textContent = 'Guardar Mascota';
}
// --- Fin nueva función ---
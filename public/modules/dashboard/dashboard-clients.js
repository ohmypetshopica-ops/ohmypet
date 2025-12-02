// public/modules/dashboard/dashboard-clients.js

// 1. Funciones de CLIENTES
import { 
    getClients, 
    searchClients, 
    getClientDetails, 
    registerClientFromDashboard, 
    updateClientProfile,
    getClientsWithPets,
    deleteClient 
} from './clients.api.js';

// 2. Funciones de MASCOTAS
import { addPetFromDashboard } from './pets.api.js';

// 3. Funciones de CITAS (CORREGIDO: Ahora apunta a appointments.api.js)
import { 
    addAppointmentFromDashboard,
    getBookedTimesForDashboard 
} from './appointments.api.js';

// --- VARIABLES GLOBALES ---
let isInitialized = false;
let currentPage = 1;
const itemsPerPage = 8;
let allClientsData = [];
let allClientsWithPets = [];
let currentClientProfile = null;
let currentClientId = null;

// --- VARIABLES AGENDAMIENTO MÚLTIPLE ---
let currentMultiAptClient = null;
let currentSchedulingStep = 1;
let petsToSchedule = [];
let scheduledAppointments = 0;
let currentPetIndex = 0;

// --- ELEMENTOS DEL DOM ---
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input');
const headerTitle = document.querySelector('#header-title');
const paginationContainer = document.querySelector('#pagination-container');
const mainAlertMessage = document.querySelector('#main-alert-message');

// Modales
const clientDetailsModal = document.querySelector('#client-details-modal');
const clientModal = document.querySelector('#client-modal'); 
const addPetModal = document.querySelector('#add-pet-modal');
const deleteClientConfirmModal = document.querySelector('#delete-client-confirm-modal');
const multiAppointmentModal = document.querySelector('#multi-appointment-modal');

// Elementos internos de los modales
const modalContentView = document.querySelector('#modal-content-body-view');
const modalContentEdit = document.querySelector('#client-edit-mode');
const clientDetailsActions = document.querySelector('#client-details-actions');
const modalClientName = document.querySelector('#modal-client-name');
const editFormMessage = document.querySelector('#edit-form-message');
const clientEditForm = document.querySelector('#client-edit-form');

// Botones del Modal de Detalles
const modalCloseBtn = document.querySelector('#modal-close-btn');
const editClientBtn = document.querySelector('#edit-client-btn');
const saveClientBtn = document.querySelector('#save-client-btn');
const cancelEditClientBtn = document.querySelector('#cancel-edit-client-btn');
const modalAddPetBtnFooter = document.querySelector('#modal-add-pet-btn-footer');
const modalDeleteClientBtn = document.querySelector('#modal-delete-client-btn');

// Elementos Modal Registro Cliente
const addClientButton = document.querySelector('#add-client-button');
const closeClientModalButton = document.querySelector('#close-client-modal-button');
const cancelClientButton = document.querySelector('#cancel-client-button');
const clientForm = document.querySelector('#client-form');
const clientFormMessage = document.querySelector('#client-form-message');

// Elementos Modal Agregar Mascota
const closeAddPetModalButton = document.querySelector('#close-add-pet-modal-button');
const cancelAddPetButton = document.querySelector('#cancel-add-pet-button');
const addPetForm = document.querySelector('#add-pet-form');
const addPetFormMessage = document.querySelector('#add-pet-form-message');
const petOwnerIdInput = document.querySelector('#pet-owner-id');
const petPhotoInput = document.querySelector('#pet-photo');
const petImagePreview = document.querySelector('#pet-image-preview');
let photoFile = null;

// Elementos Modal Multi-Cita
const multiAptClientName = document.querySelector('#multi-apt-client-name');
const multiAptProgressBar = document.querySelector('#multi-apt-progress-bar');
const multiAptDateInput = document.querySelector('#multi-apt-date');
const multiAptDateMessage = document.querySelector('#multi-apt-date-message');
const multiAptPetChecklist = document.querySelector('#multi-apt-pet-checklist');
const multiAptPetMessage = document.querySelector('#multi-apt-pet-message');
const multiAptPetCounter = document.querySelector('#multi-apt-pet-counter');
const multiAptPetTotal = document.querySelector('#multi-apt-pet-total');
const multiAptCurrentPetName = document.querySelector('#multi-apt-current-pet-name');
const multiAptServiceSelect = document.querySelector('#multi-apt-service');
const multiAptTimeSelect = document.querySelector('#multi-apt-time');
const multiAptTimeMessage = document.querySelector('#multi-apt-time-message');
const multiAptNotesTextarea = document.querySelector('#multi-apt-notes');
const multiAptIndividualMessage = document.querySelector('#multi-apt-individual-message');
const multiAptBackBtn = document.querySelector('#multi-apt-back-btn');
const multiAptNextBtn = document.querySelector('#multi-apt-next-btn');
const multiAptFinishBtn = document.querySelector('#multi-apt-finish-btn');
const closeMultiAptModalBtn = multiAppointmentModal?.querySelector('.p-6 button'); 

// Elementos Modal Borrar Cliente
const deleteClientNameElement = document.querySelector('#delete-client-name');
const confirmDeleteClientBtn = document.querySelector('#confirm-delete-client-btn');
const cancelDeleteClientBtn = document.querySelector('#cancel-delete-client-btn');
const deleteClientErrorMessage = document.querySelector('#delete-client-error-message');


// --- FUNCIONES AUXILIARES ---
const showMainAlert = (message, isError = false) => {
    if (!mainAlertMessage) return;
    mainAlertMessage.textContent = message;
    mainAlertMessage.className = `rounded-lg p-4 text-sm font-medium mb-4 ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    mainAlertMessage.classList.remove('hidden');
    setTimeout(() => mainAlertMessage.classList.add('hidden'), 4000);
};

const cleanPhoneNumber = (rawNumber) => {
    if (!rawNumber) return null;
    let cleaned = rawNumber.replace(/[^\d+]/g, '');
    return cleaned.length >= 9 ? cleaned : null;
};

// --- RENDERIZADO DE TABLA ---
const createClientRow = (client) => {
    const displayName = (client.first_name && client.last_name) 
        ? `${client.first_name} ${client.last_name}` 
        : client.full_name || 'Sin nombre';
    const phone = client.phone || 'Sin teléfono';
    const petsCount = client.pets_count || 0;
    
    let lastAppointmentText = 'Sin citas';
    if (client.last_appointment_date) {
        const date = new Date(client.last_appointment_date);
        lastAppointmentText = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
    const scheduleButton = petsCount > 0 
        ? `<button class="text-green-600 hover:text-green-900 font-medium ml-4 agendar-cita-btn" data-client-id="${client.id}" data-client-name="${displayName}">Agendar Cita</button>` 
        : `<span class="text-gray-400 text-xs ml-4 italic">Sin mascotas</span>`;

    return `
        <tr class="hover:bg-gray-50 cursor-pointer" data-client-id="${client.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">
                        ${displayName.charAt(0).toUpperCase()}
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${displayName}</div>
                        <div class="text-sm text-gray-500">${phone}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                ${petsCount} ${petsCount === 1 ? 'mascota' : 'mascotas'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${lastAppointmentText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium flex items-center justify-end gap-2">
                <button class="text-indigo-600 hover:text-indigo-900 view-details-btn font-semibold" data-client-id="${client.id}">Ver Detalles</button>
                ${scheduleButton}
            </td>
        </tr>
    `;
};

const renderClientsTable = (clients) => {
    if (!clientsTableBody) return;
    allClientsData = clients;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = clients.slice(startIndex, endIndex);
    
    clientsTableBody.innerHTML = paginatedClients.length > 0 
        ? paginatedClients.map(createClientRow).join('') 
        : `<tr><td colspan="4" class="text-center py-8 text-gray-500">No hay clientes registrados.</td></tr>`;
    
    renderPagination(clients.length);
};

const renderPagination = (totalItems) => {
    if (!paginationContainer) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }

    let html = '<div class="flex justify-center gap-2 mt-4">';
    if (currentPage > 1) html += `<button data-page="${currentPage - 1}" class="px-3 py-1 border rounded hover:bg-gray-100 bg-white">Anterior</button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
             html += `<button data-page="${i}" class="px-3 py-1 border rounded ${i === currentPage ? 'bg-green-600 text-white' : 'hover:bg-gray-100 bg-white'}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="px-2">...</span>`;
        }
    }

    if (currentPage < totalPages) html += `<button data-page="${currentPage + 1}" class="px-3 py-1 border rounded hover:bg-gray-100 bg-white">Siguiente</button>`;
    html += '</div>';
    
    paginationContainer.innerHTML = html;
    paginationContainer.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            renderClientsTable(allClientsData);
        });
    });
};

const loadAndRenderClients = async (resetPage = true) => {
    if (resetPage) currentPage = 1;
    if(clientsTableBody) clientsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">Cargando...</td></tr>`;
    
    try {
        const [clients, clientsWithPetsData] = await Promise.all([
            getClients(),
            getClientsWithPets()
        ]);
        
        allClientsWithPets = clientsWithPetsData;
        renderClientsTable(clients);
    } catch (error) {
        console.error("Error cargando clientes:", error);
        if(clientsTableBody) clientsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">Error al cargar datos.</td></tr>`;
    }
};

// --- MODAL DE DETALLES ---
const showClientDetails = async (clientId) => {
    currentClientId = clientId;
    
    if(clientDetailsModal) clientDetailsModal.classList.remove('hidden');
    if(modalContentView) modalContentView.innerHTML = '<div class="text-center py-10 text-gray-500"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>Cargando detalles...</div>';
    
    if(modalContentView) modalContentView.classList.remove('hidden');
    if(modalContentEdit) modalContentEdit.classList.add('hidden');
    if(editClientBtn) editClientBtn.classList.remove('hidden');
    if(saveClientBtn) saveClientBtn.classList.add('hidden');
    if(cancelEditClientBtn) cancelEditClientBtn.classList.add('hidden');
    if(modalAddPetBtnFooter) modalAddPetBtnFooter.classList.remove('hidden');
    if(modalDeleteClientBtn) modalDeleteClientBtn.classList.remove('hidden');

    const details = await getClientDetails(clientId);
    
    if (details && details.profile) {
        currentClientProfile = details;
        renderClientDetailsView(details);
    } else {
        if(modalContentView) modalContentView.innerHTML = '<div class="text-center py-10 text-red-500">Error al cargar los detalles.</div>';
    }
};

const renderClientDetailsView = (details) => {
    const { profile, pets, appointments } = details;
    const fullName = (profile.first_name && profile.last_name) ? `${profile.first_name} ${profile.last_name}` : profile.full_name;
    if(modalClientName) modalClientName.textContent = fullName;

    const uniquePets = pets || [];
    const recentAppointments = appointments ? appointments.slice(0, 5) : [];

    if(modalContentView) {
        modalContentView.innerHTML = `
            <div class="space-y-6">
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="font-bold text-gray-800 mb-3 border-b pb-2">Información Personal</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <p><span class="font-semibold">Teléfono:</span> ${profile.phone || 'N/A'}</p>
                        <p><span class="font-semibold">Email:</span> ${profile.email || 'N/A'}</p>
                        <p><span class="font-semibold">Documento:</span> ${profile.doc_type || ''} ${profile.doc_num || ''}</p>
                        <p><span class="font-semibold">Distrito:</span> ${profile.district || 'N/A'}</p>
                        <p><span class="font-semibold">Contacto Emergencia:</span> ${profile.emergency_contact_name || '-'} (${profile.emergency_contact_phone || '-'})</p>
                    </div>
                </div>

                <div>
                    <h3 class="font-bold text-gray-800 mb-3">Mascotas (${uniquePets.length})</h3>
                    ${uniquePets.length > 0 ? `
                        <div class="grid grid-cols-1 gap-3">
                            ${uniquePets.map(pet => `
                                <div class="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div class="h-10 w-10 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-bold mr-3">
                                        ${pet.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p class="font-bold text-gray-800">${pet.name}</p>
                                        <p class="text-xs text-gray-600">${pet.breed || 'Raza desconocida'} - ${pet.sex || ''}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-sm text-gray-500 italic">No tiene mascotas registradas.</p>'}
                </div>

                <div>
                    <h3 class="font-bold text-gray-800 mb-3">Últimas Citas</h3>
                    ${recentAppointments.length > 0 ? `
                        <div class="space-y-2">
                            ${recentAppointments.map(app => `
                                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm border-l-4 ${app.status === 'completada' ? 'border-green-500' : 'border-yellow-500'}">
                                    <div>
                                        <p class="font-semibold">${app.appointment_date}</p>
                                        <p class="text-xs text-gray-600">${app.service}</p>
                                    </div>
                                    <span class="px-2 py-1 rounded text-xs font-bold ${app.status === 'completada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                        ${app.status}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-sm text-gray-500 italic">No hay historial de citas.</p>'}
                </div>
            </div>
        `;
    }
};

// --- LÓGICA DE EDICIÓN CLIENTE ---
const switchToEditMode = () => {
    if (!currentClientProfile) return;
    const p = currentClientProfile.profile;
    
    document.querySelector('#edit-client-id').value = p.id;
    document.querySelector('#edit-first-name').value = p.first_name || '';
    document.querySelector('#edit-last-name').value = p.last_name || '';
    document.querySelector('#edit-email').value = p.email || '';
    document.querySelector('#edit-phone').value = p.phone || '';
    document.querySelector('#edit-district').value = p.district || '';
    document.querySelector('#edit-doc-type').value = p.doc_type || 'DNI';
    document.querySelector('#edit-doc-num').value = p.doc_num || '';
    document.querySelector('#edit-emergency-name').value = p.emergency_contact_name || '';
    document.querySelector('#edit-emergency-phone').value = p.emergency_contact_phone || '';

    modalContentView.classList.add('hidden');
    modalContentEdit.classList.remove('hidden');
    
    editClientBtn.classList.add('hidden');
    saveClientBtn.classList.remove('hidden');
    cancelEditClientBtn.classList.remove('hidden');
    modalAddPetBtnFooter.classList.add('hidden');
    modalDeleteClientBtn.classList.add('hidden');

    if(editFormMessage) editFormMessage.classList.add('hidden');
};

const switchToViewMode = () => {
    modalContentView.classList.remove('hidden');
    modalContentEdit.classList.add('hidden');
    editClientBtn.classList.remove('hidden');
    saveClientBtn.classList.add('hidden');
    cancelEditClientBtn.classList.add('hidden');
    modalAddPetBtnFooter.classList.remove('hidden');
    modalDeleteClientBtn.classList.remove('hidden');
};

const handleSaveClient = async (e) => {
    e.preventDefault(); 
    const saveBtn = document.querySelector('#save-client-btn');
    saveBtn.textContent = 'Guardando...';
    saveBtn.disabled = true;

    const formData = new FormData(clientEditForm);
    const updates = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        phone: formData.get('phone'),
        district: formData.get('district'),
        doc_type: formData.get('doc_type'),
        doc_num: formData.get('doc_num'),
        emergency_contact_name: formData.get('emergency_contact_name'),
        emergency_contact_phone: formData.get('emergency_contact_phone'),
        full_name: `${formData.get('first_name')} ${formData.get('last_name')}`
    };

    const { success, error } = await updateClientProfile(formData.get('id'), updates);

    if (success) {
        showMainAlert('Cliente actualizado correctamente', false);
        await showClientDetails(formData.get('id')); 
        await loadAndRenderClients(false); 
        switchToViewMode();
    } else {
        if(editFormMessage) {
            editFormMessage.textContent = 'Error al actualizar: ' + error.message;
            editFormMessage.className = 'text-red-600 text-sm mb-2 block';
            editFormMessage.classList.remove('hidden');
        }
    }
    
    saveBtn.textContent = 'Guardar Cambios';
    saveBtn.disabled = false;
};

// --- LÓGICA AGENDAMIENTO MÚLTIPLE ---
const openMultiAppointmentModal = async (clientId, clientName) => {
    if (!allClientsWithPets || allClientsWithPets.length === 0) {
        allClientsWithPets = await getClientsWithPets();
    }
    
    const client = allClientsWithPets.find(c => c.id === clientId);
    
    if (!client || !client.pets || client.pets.length === 0) {
        showMainAlert('El cliente no tiene mascotas registradas.', true);
        return;
    }

    currentMultiAptClient = client;
    petsToSchedule = [];
    currentSchedulingStep = 1;
    scheduledAppointments = 0;
    currentPetIndex = 0;

    document.querySelector('#multi-apt-client-name').textContent = clientName;
    document.querySelector('#multi-apt-date').value = '';
    document.querySelector('#multi-apt-pet-checklist').innerHTML = '';
    document.querySelector('#multi-apt-step-1-date').classList.remove('hidden');
    document.querySelector('#multi-apt-step-2-pets').classList.add('hidden');
    document.querySelector('#multi-apt-step-3-details').classList.add('hidden');
    
    document.querySelector('#multi-apt-back-btn').classList.add('hidden');
    document.querySelector('#multi-apt-next-btn').classList.remove('hidden');
    document.querySelector('#multi-apt-finish-btn').classList.add('hidden');

    multiAppointmentModal.classList.remove('hidden');
};

const handleNextStep = async () => {
    const step1 = document.querySelector('#multi-apt-step-1-date');
    const step2 = document.querySelector('#multi-apt-step-2-pets');
    const step3 = document.querySelector('#multi-apt-step-3-details');
    const backBtn = document.querySelector('#multi-apt-back-btn');
    const nextBtn = document.querySelector('#multi-apt-next-btn');

    if (currentSchedulingStep === 1) {
        const dateInput = document.querySelector('#multi-apt-date');
        if (!dateInput.value) {
            alert('Selecciona una fecha');
            return;
        }
        
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        backBtn.classList.remove('hidden');
        
        const container = document.querySelector('#multi-apt-pet-checklist');
        container.innerHTML = currentMultiAptClient.pets.map(pet => `
            <label class="flex items-center p-2 hover:bg-gray-50 border rounded cursor-pointer">
                <input type="checkbox" class="pet-checkbox h-5 w-5 text-green-600 rounded" value="${pet.id}" data-name="${pet.name}">
                <span class="ml-2 font-medium text-gray-700">${pet.name} (${pet.breed || 'Mascota'})</span>
            </label>
        `).join('');
        
        currentSchedulingStep = 2;

    } else if (currentSchedulingStep === 2) {
        const checkboxes = document.querySelectorAll('.pet-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('Selecciona al menos una mascota');
            return;
        }
        
        petsToSchedule = Array.from(checkboxes).map(cb => ({
            id: cb.value,
            name: cb.dataset.name
        }));
        
        step2.classList.add('hidden');
        step3.classList.remove('hidden');
        nextBtn.textContent = petsToSchedule.length > 1 ? 'Agendar y Siguiente' : 'Agendar y Finalizar';
        
        currentPetIndex = 0;
        loadPetSchedulingForm();
        currentSchedulingStep = 3;
    } else if (currentSchedulingStep === 3) {
        await scheduleCurrentPet();
    }
};

const loadPetSchedulingForm = async () => {
    const pet = petsToSchedule[currentPetIndex];
    document.querySelector('#multi-apt-current-pet-name').textContent = pet.name;
    document.querySelector('#multi-apt-pet-counter').textContent = currentPetIndex + 1;
    document.querySelector('#multi-apt-pet-total').textContent = petsToSchedule.length;
    
    const date = document.querySelector('#multi-apt-date').value;
    const timeSelect = document.querySelector('#multi-apt-time');
    timeSelect.innerHTML = '<option>Cargando...</option>';
    
    const bookedTimes = await getBookedTimesForDashboard(date);
    const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
    
    timeSelect.innerHTML = '<option value="">Selecciona hora</option>';
    hours.forEach(h => {
        if(!bookedTimes.includes(h)) {
            timeSelect.innerHTML += `<option value="${h}:00">${h}</option>`;
        }
    });
    timeSelect.disabled = false;
};

const scheduleCurrentPet = async () => {
    const service = document.querySelector('#multi-apt-service').value;
    const time = document.querySelector('#multi-apt-time').value;
    const notes = document.querySelector('#multi-apt-notes').value;
    
    if(!service || !time) {
        alert('Completa servicio y hora');
        return;
    }
    
    const nextBtn = document.querySelector('#multi-apt-next-btn');
    nextBtn.disabled = true;
    nextBtn.textContent = 'Agendando...';
    
    const pet = petsToSchedule[currentPetIndex];
    const apptData = {
        user_id: currentMultiAptClient.id,
        pet_id: pet.id,
        appointment_date: document.querySelector('#multi-apt-date').value,
        appointment_time: time,
        service: service,
        notes: notes,
        status: 'confirmada'
    };
    
    const { success } = await addAppointmentFromDashboard(apptData);
    
    if (success) {
        scheduledAppointments++;
        currentPetIndex++;
        
        if (currentPetIndex < petsToSchedule.length) {
            loadPetSchedulingForm();
            nextBtn.disabled = false;
            nextBtn.textContent = currentPetIndex === petsToSchedule.length - 1 ? 'Agendar y Finalizar' : 'Agendar y Siguiente';
        } else {
            multiAppointmentModal.classList.add('hidden');
            showMainAlert(`¡${scheduledAppointments} citas agendadas exitosamente!`, false);
            nextBtn.disabled = false;
        }
    } else {
        alert('Error al agendar. Intenta de nuevo.');
        nextBtn.disabled = false;
        nextBtn.textContent = 'Reintentar';
    }
};

// --- LÓGICA DE REGISTRO DE CLIENTE (EL ARREGLO CRÍTICO PARA EL REFRESH) ---
const openClientModal = () => {
    if(clientModal) clientModal.classList.remove('hidden');
    if(clientForm) clientForm.reset();
    if(clientFormMessage) clientFormMessage.classList.add('hidden');
};

const closeClientModal = () => {
    if(clientModal) clientModal.classList.add('hidden');
    if(clientForm) clientForm.reset();
};

const handleAddClient = async (e) => {
    e.preventDefault(); // ¡CRUCIAL! Evita el refresh de la página
    
    // Botón guardar para feedback
    const submitButton = clientForm.querySelector('button[type="submit"]');
    if(submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
    }

    const formData = new FormData(clientForm);
    
    const phoneRaw = formData.get('phone');
    const emergencyPhoneRaw = formData.get('emergency_contact_phone');
    
    const phoneCleaned = cleanPhoneNumber(phoneRaw);
    const emergencyPhoneCleaned = cleanPhoneNumber(emergencyPhoneRaw);

    const clientData = {
        firstName: formData.get('first_name').trim(),
        lastName: formData.get('last_name').trim(),
        email: formData.get('email').trim() || null,
        password: formData.get('password') || null,
        phone: phoneCleaned,
        district: formData.get('district').trim() || null,
        docType: formData.get('doc_type'),
        docNum: formData.get('doc_num').trim() || null,
        emergencyContactName: formData.get('emergency_contact_name').trim() || null,
        emergencyContactPhone: emergencyPhoneCleaned,
    };

    // Validación básica
    if (!clientData.firstName || !clientData.lastName || !clientData.phone) {
        if(clientFormMessage) {
            clientFormMessage.textContent = 'Los campos Nombre, Apellido y Teléfono son obligatorios.';
            clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
            clientFormMessage.classList.remove('hidden');
        }
        if(submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Cliente';
        }
        return;
    }

    const { success, error, message } = await registerClientFromDashboard(clientData);

    if (success) {
        if(clientFormMessage) {
            clientFormMessage.textContent = `¡Cliente registrado con éxito! (${message})`;
            clientFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
            clientFormMessage.classList.remove('hidden');
        }
        setTimeout(async () => {
            closeClientModal();
            await loadAndRenderClients(true); // Refrescar tabla
        }, 1500);
    } else {
        if(clientFormMessage) {
            clientFormMessage.textContent = `Error: ${error.message}`;
            clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
            clientFormMessage.classList.remove('hidden');
        }
    }

    if(submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Cliente';
    }
};

// --- LÓGICA AGREGAR MASCOTA ---
const openAddPetModal = (clientId) => {
    currentClientId = clientId;
    if(petOwnerIdInput) petOwnerIdInput.value = clientId;
    if(addPetFormMessage) addPetFormMessage.classList.add('hidden');
    if(addPetForm) addPetForm.reset();
    if(petImagePreview) {
        petImagePreview.classList.add('hidden');
        petImagePreview.src = 'https://via.placeholder.com/100';
    }
    photoFile = null;
    if(addPetModal) addPetModal.classList.remove('hidden');
    if(clientDetailsModal) clientDetailsModal.classList.add('hidden');
};

const closeAddPetModal = () => {
    if(addPetModal) addPetModal.classList.add('hidden');
    if(clientDetailsModal) clientDetailsModal.classList.remove('hidden');
    // Refrescar vista detalles
    if (currentClientId) {
        showClientDetails(currentClientId);
    }
};

// --- LÓGICA BORRAR CLIENTE ---
const openDeleteClientModal = (clientId, clientName) => {
    currentClientId = clientId;
    if(deleteClientNameElement) deleteClientNameElement.textContent = clientName;
    if(deleteClientErrorMessage) deleteClientErrorMessage.classList.add('hidden');
    if(confirmDeleteClientBtn) {
        confirmDeleteClientBtn.disabled = false;
        confirmDeleteClientBtn.textContent = 'Sí, Eliminar Todo';
    }
    if(deleteClientConfirmModal) deleteClientConfirmModal.classList.remove('hidden');
};

const closeDeleteClientModal = () => {
    if(deleteClientConfirmModal) deleteClientConfirmModal.classList.add('hidden');
};

const handleDeleteClient = async () => {
    if (!currentClientId) return;

    if(confirmDeleteClientBtn) {
        confirmDeleteClientBtn.disabled = true;
        confirmDeleteClientBtn.textContent = 'Eliminando...';
    }
    if(deleteClientErrorMessage) deleteClientErrorMessage.classList.add('hidden');

    const { success, error } = await deleteClient(currentClientId);

    if (success) {
        closeDeleteClientModal();
        modalCloseBtn.click(); // Cerrar detalle
        showMainAlert('Cliente eliminado exitosamente.', false);
        await loadAndRenderClients(true); 
    } else {
        if(deleteClientErrorMessage) {
            deleteClientErrorMessage.textContent = `Error: ${error.message}`;
            deleteClientErrorMessage.classList.remove('hidden');
        }
        if(confirmDeleteClientBtn) {
            confirmDeleteClientBtn.disabled = false;
            confirmDeleteClientBtn.textContent = 'Sí, Eliminar Todo';
        }
    }
};


// --- INICIALIZACIÓN ---
const initializeClientsSection = async () => {
    if (!isInitialized) {
        isInitialized = true;
        if (headerTitle) headerTitle.textContent = 'Gestión de Clientes';
        
        // Listeners Búsqueda
        let debounceTimer;
        clientSearchInput?.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const term = e.target.value.trim();
                const clients = term ? await searchClients(term) : await getClients();
                renderClientsTable(clients);
            }, 300);
        });

        // DELEGACIÓN DE EVENTOS EN TABLA (CLAVE PARA LOS BOTONES)
        clientsTableBody?.addEventListener('click', async (e) => {
            const viewBtn = e.target.closest('.view-details-btn');
            if (viewBtn) {
                const clientId = viewBtn.dataset.clientId;
                showClientDetails(clientId);
            }

            const scheduleBtn = e.target.closest('.agendar-cita-btn');
            if (scheduleBtn) {
                const clientId = scheduleBtn.dataset.clientId;
                const clientName = scheduleBtn.dataset.clientName;
                openMultiAppointmentModal(clientId, clientName);
            }
        });

        // Listeners Modal Detalles y Edición
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => clientDetailsModal.classList.add('hidden'));
        if (editClientBtn) editClientBtn.addEventListener('click', switchToEditMode);
        if (cancelEditClientBtn) cancelEditClientBtn.addEventListener('click', switchToViewMode);
        if (saveClientBtn) saveClientBtn.addEventListener('click', handleSaveClient);
        
        // Botón Agregar Mascota dentro del modal
        if (modalAddPetBtnFooter) {
            modalAddPetBtnFooter.addEventListener('click', () => {
                if (currentClientId) {
                    document.querySelector('#pet-owner-id').value = currentClientId;
                    addPetModal.classList.remove('hidden');
                }
            });
        }
        
        // Botón Borrar Cliente dentro del modal
        if (modalDeleteClientBtn) {
            modalDeleteClientBtn.addEventListener('click', () => {
                if (currentClientProfile && currentClientProfile.profile) {
                    openDeleteClientModal(currentClientProfile.profile.id, modalClientName.textContent);
                }
            });
        }

        // Listeners Modal Multi-Cita
        document.querySelector('#multi-apt-next-btn')?.addEventListener('click', handleNextStep);
        document.querySelector('#multi-apt-finish-btn')?.addEventListener('click', handleNextStep); 
        document.querySelector('#multi-apt-back-btn')?.addEventListener('click', () => {
            if (currentSchedulingStep === 2) {
                document.querySelector('#multi-apt-step-2-pets').classList.add('hidden');
                document.querySelector('#multi-apt-step-1-date').classList.remove('hidden');
                document.querySelector('#multi-apt-back-btn').classList.add('hidden');
                currentSchedulingStep = 1;
            }
        });
        
        if(closeMultiAptModalBtn) closeMultiAptModalBtn.addEventListener('click', () => multiAppointmentModal.classList.add('hidden'));

        // Listeners Modal Registro Cliente
        if(addClientButton) addClientButton.addEventListener('click', openClientModal);
        if(closeClientModalButton) closeClientModalButton.addEventListener('click', () => clientModal.classList.add('hidden'));
        if(cancelClientButton) cancelClientButton.addEventListener('click', () => clientModal.classList.add('hidden'));
        
        // --- AQUÍ SE ASIGNA EL HANDLER QUE PREVIENE EL REFRESH ---
        if(clientForm) clientForm.addEventListener('submit', handleAddClient);

        // Listeners Modal Agregar Mascota
        if(closeAddPetModalButton) closeAddPetModalButton.addEventListener('click', closeAddPetModal);
        if(cancelAddPetButton) cancelAddPetButton.addEventListener('click', closeAddPetModal);
        if(addPetForm) {
             addPetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitButton = addPetForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Guardando...';

                const formData = new FormData(addPetForm);
                
                const petData = {
                    owner_id: formData.get('owner_id'),
                    name: formData.get('name'),
                    breed: formData.get('breed'),
                    sex: formData.get('sex'),
                    birth_date: formData.get('birth_date') || null,
                    observations: formData.get('observations')
                };
                
                const { success, error } = await addPetFromDashboard(petData);
                if(success) {
                    showMainAlert("Mascota agregada", false);
                    closeAddPetModal();
                } else {
                     if(addPetFormMessage) {
                        addPetFormMessage.textContent = error.message;
                        addPetFormMessage.classList.remove('hidden');
                     }
                }
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Mascota';
             });
        }
        
        if(petPhotoInput) {
            petPhotoInput.addEventListener('change', (e) => {
                if(e.target.files[0]) {
                    photoFile = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if(petImagePreview) {
                            petImagePreview.src = ev.target.result;
                            petImagePreview.classList.remove('hidden');
                        }
                    };
                    reader.readAsDataURL(photoFile);
                }
            });
        }

        // Listeners Modal Borrar Cliente
        if(cancelDeleteClientBtn) cancelDeleteClientBtn.addEventListener('click', closeDeleteClientModal);
        if(confirmDeleteClientBtn) confirmDeleteClientBtn.addEventListener('click', handleDeleteClient);

        // Cerrar modales al hacer clic fuera
        const modals = [clientDetailsModal, clientModal, addPetModal, multiAppointmentModal, deleteClientConfirmModal];
        modals.forEach(modal => {
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });
    }

    await loadAndRenderClients(true);
};

document.addEventListener('DOMContentLoaded', initializeClientsSection);
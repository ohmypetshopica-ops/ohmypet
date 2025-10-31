// public/modules/dashboard/dashboard-clients.js

import { 
    getClients, 
    searchClients, 
    getClientDetails, 
    registerClientFromDashboard, 
    addPetFromDashboard, 
    updateClientProfile,
    getClientsWithPets,
    getBookedTimesForDashboard,
    addAppointmentFromDashboard
} from './dashboard.api.js';
import { supabase } from '../../core/supabase.js'; 

// --- INICIO DE LA CORRECCIÓN: Bandera de inicialización ---
let isInitialized = false;
// --- FIN DE LA CORRECCIÓN ---

// ====== VARIABLES DE PAGINACIÓN AGREGADAS ======
let currentPage = 1;
const itemsPerPage = 8; // Número de clientes por página
let allClientsData = []; // Almacena todos los clientes
let allClientsWithPets = []; // <<-- NUEVO: Almacena clientes con info de mascotas
// ====== FIN VARIABLES DE PAGINACIÓN ======

// ====== ESTADO PARA AGENDAMIENTO MÚLTIPLE ======
let currentMultiAptClient = null;
let currentSchedulingStep = 1; // 1: Date, 2: Pets, 3: Details Loop
let petsToSchedule = []; // Array de IDs de las mascotas seleccionadas
let scheduledAppointments = 0; // Contador de citas ya agendadas
let currentPetIndex = 0; // Índice de la mascota actual en el paso 3
// ====== FIN ESTADO MÚLTIPLE ======

// ====== FUNCIÓN createClientRow DEFINIDA LOCALMENTE ======
const createClientRow = (client) => {
    const displayName = (client.first_name && client.last_name) 
        ? `${client.first_name} ${client.last_name}` 
        : client.full_name || 'Sin nombre';
    const avatarUrl = client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=A4D0A4&color=FFFFFF`;
    const phone = client.phone || 'Sin teléfono';
    const petsCount = client.pets_count || 0;
    
    let lastAppointmentText = 'Sin citas';
    if (client.last_appointment_date) {
        const date = new Date(client.last_appointment_date);
        lastAppointmentText = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
    // --- LÓGICA DEL BOTÓN DE AGENDAMIENTO ---
    const scheduleButton = `
        <button class="text-green-600 hover:text-green-900 font-medium ml-4 agendar-cita-btn" data-client-id="${client.id}" data-client-name="${displayName}">Agendar Cita</button>
    `;

    return `
        <tr class="hover:bg-gray-50 cursor-pointer" data-client-id="${client.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img src="${avatarUrl}" alt="Avatar" class="h-10 w-10 rounded-full object-cover">
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
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium flex items-center justify-end">
                <button class="text-indigo-600 hover:text-indigo-900 view-details-btn" data-client-id="${client.id}">Ver Detalles</button>
                ${petsCount > 0 ? scheduleButton : ''} 
            </td>
        </tr>
    `;
};
// ====== FIN FUNCIÓN createClientRow ======

// --- UTILITY: LIMPIEZA DE NÚMEROS DE TELÉFONO ---
const cleanPhoneNumber = (rawNumber) => {
    if (!rawNumber) return null;
    let cleaned = rawNumber.replace(/[^\d+]/g, '');
    if (cleaned.length < 9 || (cleaned.length > 9 && !cleaned.startsWith('+'))) {
        let digitsOnly = cleaned.replace(/\D/g, '');
        if (digitsOnly.length === 9) {
            return digitsOnly;
        }
        if (digitsOnly.length > 9) {
            return digitsOnly.slice(-9);
        }
        return null;
    }
    return cleaned;
};
// --- FIN UTILITY ---


// --- ELEMENTOS DEL DOM ---
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input');
const headerTitle = document.querySelector('#header-title');
const paginationContainer = document.querySelector('#pagination-container');

// --- ELEMENTOS DEL MODAL DE DETALLES ---
const clientDetailsModal = document.querySelector('#client-details-modal');
const modalCloseBtn = document.querySelector('#modal-close-btn');
const modalClientName = document.querySelector('#modal-client-name');
const modalContentView = document.querySelector('#modal-content-body-view');
const modalContentEdit = document.querySelector('#client-edit-mode');
const clientEditForm = document.querySelector('#client-edit-form');
const editFormMessage = document.querySelector('#edit-form-message');

let currentClientId = null;
let currentClientProfile = null;

// --- ELEMENTOS DE EDICIÓN Y FOOTER ---
const editClientBtn = document.querySelector('#edit-client-btn');
const saveClientBtn = document.querySelector('#save-client-btn');
const cancelEditClientBtn = document.querySelector('#cancel-edit-client-btn');
const modalAddPetBtnFooter = document.querySelector('#modal-add-pet-btn-footer');

// --- ELEMENTOS DEL MODAL DE REGISTRO DE CLIENTE---
const addClientButton = document.querySelector('#add-client-button');
const clientModal = document.querySelector('#client-modal');
const closeClientModalButton = document.querySelector('#close-client-modal-button');
const cancelClientButton = document.querySelector('#cancel-client-button');
const clientForm = document.querySelector('#client-form');
const clientFormMessage = document.querySelector('#client-form-message');

// --- ELEMENTOS DEL MODAL DE AGREGAR MASCOTA ---
const addPetModal = document.querySelector('#add-pet-modal');
const closeAddPetModalButton = document.querySelector('#close-add-pet-modal-button');
const cancelAddPetButton = document.querySelector('#cancel-add-pet-button');
const addPetForm = document.querySelector('#add-pet-form');
const addPetFormMessage = document.querySelector('#add-pet-form-message');
const petOwnerIdInput = document.querySelector('#pet-owner-id');
const petPhotoInput = document.querySelector('#pet-photo');
const petImagePreview = document.querySelector('#pet-image-preview');
let photoFile = null;

// --- ELEMENTOS DEL MODAL DE AGENDAMIENTO MÚLTIPLE (NUEVOS) ---
const multiAppointmentModal = document.querySelector('#multi-appointment-modal');
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
const multiAptSteps = document.querySelectorAll('.multi-apt-step');
const closeMultiAptModalBtn = multiAppointmentModal?.querySelector('.p-6 button');

// ====== FUNCIÓN DE RENDERIZADO DE PAGINACIÓN AGREGADA ======
const renderPagination = (totalItems) => {
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex justify-center items-center gap-2 mt-6">';
    
    if (currentPage > 1) {
        paginationHTML += `
            <button data-page="${currentPage - 1}" 
                    class="px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 font-medium text-sm">
                Anterior
            </button>
        `;
    }

    const maxVisible = 3;
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button data-page="${i}" 
                    class="w-10 h-10 rounded-lg font-medium text-sm ${i === currentPage ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}">
                ${i}
            </button>
        `;
    }

    if (currentPage < totalPages) {
        paginationHTML += `
            <button data-page="${currentPage + 1}" 
                    class="px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 font-medium text-sm">
                Siguiente
            </button>
        `;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const newPage = parseInt(button.dataset.page);
            if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
                currentPage = newPage;
                renderClientsTable(allClientsData);
            }
        });
    });
};
// ====== FIN FUNCIÓN DE PAGINACIÓN ======

// ====== RENDERIZADO DE DATOS MODIFICADO PARA PAGINACIÓN ======
const renderClientsTable = (clients) => {
    if (!clientsTableBody) return;
    
    allClientsData = clients;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = clients.slice(startIndex, endIndex);
    
    clientsTableBody.innerHTML = paginatedClients.length > 0 
        ? paginatedClients.map(createClientRow).join('') 
        : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
    
    renderPagination(clients.length);
};
// ====== FIN RENDERIZADO MODIFICADO ======

// --- LÓGICA DEL MODAL DE AGENDAMIENTO MÚLTIPLE (NUEVA) ---

const openMultiAppointmentModal = (clientId, clientName) => {
    const client = allClientsWithPets.find(c => c.id === clientId);
    if (!client || client.pets.length === 0) {
        alert('Este cliente no tiene mascotas registradas para agendar una cita.');
        return;
    }
    currentMultiAptClient = client;
    scheduledAppointments = 0;
    currentPetIndex = 0;
    petsToSchedule = [];
    currentSchedulingStep = 1;

    multiAptClientName.textContent = clientName;
    multiAptDateInput.value = '';
    multiAptDateInput.min = new Date().toISOString().split("T")[0]; // Solo fechas futuras
    multiAptDateMessage.classList.add('hidden');
    multiAptPetMessage.classList.add('hidden');
    multiAptIndividualMessage.classList.add('hidden');
    
    multiAppointmentModal.classList.remove('hidden');
    showMultiAptStep(1);
};

const closeMultiAppointmentModal = () => {
    multiAppointmentModal.classList.add('hidden');
    // Reiniciar el estado
    currentMultiAptClient = null;
    petsToSchedule = [];
    currentSchedulingStep = 1;
    scheduledAppointments = 0;
    currentPetIndex = 0;
    // Forzar recarga de la tabla para actualizar la columna de Última Cita
    initializeClientsSection();
};

const showMultiAptStep = (step) => {
    currentSchedulingStep = step;
    multiAptSteps.forEach((el, index) => el.classList.toggle('hidden', index + 1 !== step));
    multiAptProgressBar.style.width = `${(step / 3) * 100}%`;
    
    // Configurar botones
    multiAptBackBtn.classList.toggle('hidden', step === 1);
    multiAptNextBtn.classList.remove('hidden', step === 3);
    multiAptFinishBtn.classList.add('hidden');

    if (step === 2) renderPetChecklist();
    if (step === 3) startSchedulingLoop();
};

const renderPetChecklist = () => {
    multiAptPetChecklist.innerHTML = '';
    currentMultiAptClient.pets.forEach(pet => {
        const petInfo = `(${pet.breed || 'Sin raza'})`;
        multiAptPetChecklist.innerHTML += `
            <div class="flex items-center">
                <input type="checkbox" id="pet-${pet.id}" value="${pet.id}" data-pet-name="${pet.name}" class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded pet-to-schedule-checkbox">
                <label for="pet-${pet.id}" class="ml-3 block text-sm font-medium text-gray-700">${pet.name} ${petInfo}</label>
            </div>
        `;
    });
};

const startSchedulingLoop = () => {
    multiAptProgressBar.style.width = `100%`;
    multiAptTimeSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
    multiAptTimeSelect.disabled = true;
    
    const petIds = petsToSchedule.map(p => p.id);
    const total = petIds.length;
    
    if (currentPetIndex >= total) {
        // Finaliza el flujo
        multiAptSteps.forEach(el => el.classList.add('hidden'));
        document.getElementById('multi-apt-step-3-details').classList.remove('hidden'); // Mantener visible para el mensaje final
        multiAptNextBtn.classList.add('hidden');
        multiAptBackBtn.classList.add('hidden');
        multiAptIndividualMessage.textContent = `✅ Se han agendado ${scheduledAppointments} citas para el cliente. Puedes cerrar el modal.`;
        multiAptIndividualMessage.className = 'block p-3 rounded-lg bg-green-100 text-green-700 text-sm';
        multiAptIndividualMessage.classList.remove('hidden');
        multiAptFinishBtn.classList.remove('hidden'); // Botón de Finalizar Cita para cerrar el modal
        return;
    }
    
    const currentPet = petsToSchedule[currentPetIndex];
    multiAptPetCounter.textContent = currentPetIndex + 1;
    multiAptPetTotal.textContent = total;
    multiAptCurrentPetName.textContent = currentPet.name;
    
    multiAptServiceSelect.value = '';
    multiAptNotesTextarea.value = '';
    
    // Cargar horarios disponibles para la fecha seleccionada
    renderAvailableTimes(multiAptDateInput, multiAptTimeSelect);

    // Si es el último, cambiar el botón de "Siguiente" a "Agendar y Finalizar"
    if (currentPetIndex === total - 1) {
        multiAptNextBtn.classList.add('hidden');
        multiAptFinishBtn.classList.remove('hidden');
        multiAptFinishBtn.textContent = 'Agendar y Finalizar';
    } else {
        multiAptNextBtn.classList.remove('hidden');
        multiAptFinishBtn.classList.add('hidden');
        multiAptNextBtn.textContent = 'Agendar y Siguiente';
    }
    
    // Habilitar los botones de agendamiento
    multiAptNextBtn.disabled = false;
    multiAptFinishBtn.disabled = false;
};

const handleNextStep = async (event) => {
    // Determinar si el clic viene del botón 'Next' o 'Finish'
    const isFinishButton = event.target.id === 'multi-apt-finish-btn';
    
    switch (currentSchedulingStep) {
        case 1:
            if (!multiAptDateInput.value) {
                multiAptDateMessage.textContent = '❌ Por favor, selecciona una fecha.';
                multiAptDateMessage.className = 'block p-3 rounded-lg bg-red-100 text-red-700 text-sm';
                multiAptDateMessage.classList.remove('hidden');
                return;
            }
            showMultiAptStep(2);
            break;
        case 2:
            const selectedPets = Array.from(multiAptPetChecklist.querySelectorAll('.pet-to-schedule-checkbox:checked')).map(checkbox => {
                return { 
                    id: checkbox.value, 
                    name: checkbox.dataset.petName,
                    phone: currentMultiAptClient.phone,
                    firstName: currentMultiAptClient.first_name || currentMultiAptClient.full_name
                };
            });
            
            multiAptPetMessage.classList.add('hidden');

            if (selectedPets.length === 0) {
                multiAptPetMessage.textContent = '❌ Debes seleccionar al menos una mascota.';
                multiAptPetMessage.className = 'block p-3 rounded-lg bg-red-100 text-red-700 text-sm';
                multiAptPetMessage.classList.remove('hidden');
                return;
            }
            
            // ** FIX 1: ELIMINAR LA REGLA DE EXCLUSIÓN Y ALERTA **
            // Ahora se agendan TODAS las seleccionadas
            petsToSchedule = selectedPets;
            currentPetIndex = 0;
            scheduledAppointments = 0;
            showMultiAptStep(3);
            break;
        case 3:
            // Ejecutar agendamiento para la mascota actual
            await scheduleSinglePetAppointment();
            // La lógica dentro de scheduleSinglePetAppointment se encargará de llamar a startSchedulingLoop
            // que es lo que lo mueve al siguiente paso o muestra el mensaje final.
            break;
    }
};

const handleBackStep = () => {
    multiAptIndividualMessage.classList.add('hidden');
    if (currentSchedulingStep === 1) return;
    if (currentSchedulingStep === 3) {
        showMultiAptStep(2);
    } else {
        showMultiAptStep(currentSchedulingStep - 1);
    }
};

const scheduleSinglePetAppointment = async () => {
    const petId = petsToSchedule[currentPetIndex].id;
    const petName = petsToSchedule[currentPetIndex].name;
    const petPhone = petsToSchedule[currentPetIndex].phone;
    const petOwnerFirstName = petsToSchedule[currentPetIndex].firstName;
    
    const service = multiAptServiceSelect.value;
    const time = multiAptTimeSelect.value;
    const notes = multiAptNotesTextarea.value;
    const date = multiAptDateInput.value;
    
    if (!service || !time) {
        multiAptIndividualMessage.textContent = '❌ Por favor, selecciona un servicio y una hora.';
        multiAptIndividualMessage.className = 'block p-3 rounded-lg bg-red-100 text-red-700 text-sm';
        multiAptIndividualMessage.classList.remove('hidden');
        // Re-habilitar botones si falla la validación del paso 3
        multiAptNextBtn.disabled = false;
        multiAptFinishBtn.disabled = false;
        return;
    }

    multiAptNextBtn.disabled = true;
    multiAptFinishBtn.disabled = true;
    
    multiAptIndividualMessage.textContent = `⏳ Agendando cita para ${petName}...`;
    multiAptIndividualMessage.className = 'block p-3 rounded-lg bg-blue-100 text-blue-700 text-sm';
    multiAptIndividualMessage.classList.remove('hidden');
    
    const appointmentData = {
        user_id: currentMultiAptClient.id,
        pet_id: petId,
        appointment_date: date,
        appointment_time: time,
        service: service,
        notes: notes || null,
        status: 'confirmada' // Agendada por Admin se confirma directamente
    };
    
    const { success, error } = await addAppointmentFromDashboard(appointmentData);
    
    if (success) {
        scheduledAppointments++;
        
        // Abrir WhatsApp de notificación
        try {
            const appointmentDate = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            const message = `*¡Nueva Solicitud de Cita OhMyPet!*\n(Ya registrada en el sistema)\n\n*Cliente:* ${petOwnerFirstName}\n*Mascota:* ${petName}\n*Fecha:* ${appointmentDate}\n*Hora:* ${time.slice(0, 5)}\n*Servicio:* ${service}\n\n¡Te esperamos! 🐾`;
            
            if (petPhone && petPhone !== 'N/A' && petPhone.length >= 9) {
                 const whatsappUrl = `https://wa.me/51${petPhone}?text=${encodeURIComponent(message)}`;
                 window.open(whatsappUrl, '_blank');
            }
        } catch(e) {
            console.error("Error al intentar abrir WhatsApp:", e);
        }

        // Pasar a la siguiente mascota
        currentPetIndex++;
        
        // ** FIX 3: Llamar a startSchedulingLoop para continuar o salir del bucle **
        startSchedulingLoop();

    } else {
        multiAptIndividualMessage.textContent = `❌ Error al agendar cita para ${petName}: ${error.message}`;
        multiAptIndividualMessage.className = 'block p-3 rounded-lg bg-red-100 text-red-700 text-sm';
        multiAptIndividualMessage.classList.remove('hidden');
        
        // Re-habilitar botones si falla el agendamiento con la API
        multiAptNextBtn.disabled = false;
        multiAptFinishBtn.disabled = false;
    }
};

const renderAvailableTimes = async (dateInput, timeSelect) => {
    const selectedDate = dateInput.value;
    if (!selectedDate) {
        timeSelect.innerHTML = '<option value="">Selecciona una fecha</option>';
        timeSelect.disabled = true;
        return;
    }

    multiAptTimeMessage.textContent = 'Cargando disponibilidad...';
    
    const bookedTimes = await getBookedTimesForDashboard(selectedDate);
    const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
    
    timeSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
    hours.forEach(hour => {
        if (!bookedTimes.includes(hour)) {
            const option = document.createElement('option');
            option.value = hour + ':00';
            option.textContent = hour;
            timeSelect.appendChild(option);
        }
    });
    timeSelect.disabled = false;
    multiAptTimeMessage.textContent = `Se encontraron ${timeSelect.options.length - 1} horarios disponibles.`;
};


// --- LÓGICA DEL MODAL DE DETALLES Y EDICIÓN (SIN CAMBIOS RELEVANTES EN ESTE CONTEXTO) ---
const openModal = () => clientDetailsModal.classList.remove('hidden');
const closeModal = () => {
    clientDetailsModal.classList.add('hidden');
    currentClientId = null;
    currentClientProfile = null;
    switchToViewMode();
};

const renderEditForm = (profile) => {
    editFormMessage.classList.add('hidden');
    document.querySelector('#edit-client-id').value = profile.id;
    document.querySelector('#edit-first-name').value = profile.first_name || '';
    document.querySelector('#edit-last-name').value = profile.last_name || '';
    document.querySelector('#edit-email').value = profile.email || 'N/A';
    document.querySelector('#edit-phone').value = profile.phone || ''; 
    document.querySelector('#edit-district').value = profile.district || '';
    document.querySelector('#edit-doc-type').value = profile.doc_type || '';
    document.querySelector('#edit-doc-num').value = profile.doc_num || '';
    document.querySelector('#edit-emergency-name').value = profile.emergency_contact_name || '';
    document.querySelector('#edit-emergency-phone').value = profile.emergency_contact_phone || '';
};

const switchToEditMode = () => {
    if (!currentClientProfile) return;
    
    modalContentView.classList.add('hidden');
    modalContentEdit.classList.remove('hidden');

    editClientBtn.classList.add('hidden');
    saveClientBtn.classList.remove('hidden');
    cancelEditClientBtn.classList.remove('hidden');
    modalAddPetBtnFooter.classList.add('hidden');
    
    renderEditForm(currentClientProfile.profile);
};

const switchToViewMode = () => {
    modalContentEdit.classList.add('hidden');
    modalContentView.classList.remove('hidden');

    editClientBtn.classList.remove('hidden');
    saveClientBtn.classList.add('hidden');
    cancelEditClientBtn.classList.add('hidden');
    modalAddPetBtnFooter.classList.remove('hidden');
    
    if (currentClientProfile) {
        populateModal(currentClientProfile);
    } else {
        modalContentView.innerHTML = '<div class="text-center py-10 text-gray-500">Cargando...</div>';
    }
};

const handleSaveClient = async () => {
    const form = document.querySelector('#client-edit-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const clientId = formData.get('id');
    
    const phoneRaw = formData.get('phone');
    const emergencyPhoneRaw = formData.get('emergency_contact_phone');
    
    const phoneCleaned = cleanPhoneNumber(phoneRaw);
    const emergencyPhoneCleaned = cleanPhoneNumber(emergencyPhoneRaw);

    const updatedData = {
        first_name: formData.get('first_name').trim(),
        last_name: formData.get('last_name').trim(),
        full_name: `${formData.get('first_name').trim()} ${formData.get('last_name').trim()}`,
        phone: phoneCleaned,
        doc_type: formData.get('doc_type') || null,
        doc_num: formData.get('doc_num').trim() || null,
        district: formData.get('district').trim() || null,
        emergency_contact_name: formData.get('emergency_contact_name').trim() || null,
        emergency_contact_phone: emergencyPhoneCleaned,
    };
    
    if (!updatedData.first_name || !updatedData.last_name) {
        editFormMessage.textContent = '⚠️ Los campos Nombre y Apellido son obligatorios.';
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
        return;
    }

    if (!updatedData.phone || updatedData.phone.length < 9) {
        editFormMessage.textContent = '⚠️ El número de teléfono debe tener al menos 9 dígitos.';
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
        return;
    }

    saveClientBtn.disabled = true;
    saveClientBtn.textContent = 'Guardando...';
    editFormMessage.textContent = '⏳ Guardando cambios...';
    editFormMessage.className = 'block p-3 rounded-md bg-blue-100 text-blue-700 text-sm mb-4';
    editFormMessage.classList.remove('hidden');

    const result = await updateClientProfile(clientId, updatedData);

    if (result.success) {
        editFormMessage.textContent = '✅ Cliente actualizado exitosamente.';
        editFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
        
        const updatedDetails = await getClientDetails(clientId);
        if (updatedDetails) {
            currentClientProfile = updatedDetails;
            editFormMessage.textContent = '✅ Cliente actualizado exitosamente.';
            editFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
            editFormMessage.classList.remove('hidden');
            
            setTimeout(() => {
                switchToViewMode();
                initializeClientsSection();
            }, 1000);
        } else {
            editFormMessage.textContent = '⚠️ Cliente actualizado, pero hubo un error al recargar los detalles.';
            editFormMessage.className = 'block p-3 rounded-md bg-yellow-100 text-yellow-700 text-sm mb-4';
            editFormMessage.classList.remove('hidden');
        }
    } else {
        editFormMessage.textContent = `❌ Error al guardar: ${result.error?.message || 'Error desconocido'}`;
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
    }
    
    saveClientBtn.disabled = false;
    saveClientBtn.textContent = 'Guardar Cambios';
};


const populateModal = (details) => {
    currentClientProfile = details;
    const { profile, pets, appointments } = details;

    const uniquePets = pets.filter((pet, index, self) =>
        index === self.findIndex((p) => p.id === pet.id)
    );

    const displayName = (profile.first_name && profile.last_name) 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.full_name;
    
    modalClientName.textContent = displayName;

    modalContentView.innerHTML = `
        <div id="client-view-data" class="space-y-6">
            <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Información de Contacto</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <p><strong>Email:</strong> <a href="mailto:${profile.email || ''}" class="text-blue-600 hover:underline">${profile.email || 'N/A'}</a></p>
                    <p><strong>Teléfono:</strong> <a href="https://wa.me/51${profile.phone || ''}" target="_blank" class="text-blue-600 hover:underline">${profile.phone || 'N/A'}</a></p>
                    <p><strong>Tipo de Doc.:</strong> ${profile.doc_type || 'N/A'}</p>
                    <p><strong>Nro. Doc.:</strong> ${profile.doc_num || 'N/A'}</p>
                    <p><strong>Distrito:</strong> ${profile.district || 'N/A'}</p>
                    <p><strong>Contacto de Emergencia:</strong> ${profile.emergency_contact_name || 'N/A'} - ${profile.emergency_contact_phone || 'N/A'}</p>
                </div>
            </div>

            <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Mascotas (${uniquePets.length})</h3>
                ${uniquePets.length > 0 ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${uniquePets.map(pet => `
                            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start space-x-4">
                                ${pet.image_url 
                                    ? `<img src="${pet.image_url}" alt="${pet.name}" class="h-16 w-16 rounded-full object-cover flex-shrink-0">` 
                                    : `<div class="h-16 w-16 bg-gradient-to-br from-green-300 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                         <span class="text-white font-bold text-xl">${pet.name.charAt(0).toUpperCase()}</span>
                                       </div>`
                                }
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-semibold text-gray-800 truncate">${pet.name}</h4>
                                    <p class="text-sm text-gray-600">${pet.breed || 'Raza no especificada'} - ${pet.sex || 'N/A'}</p>
                                    <p class="text-sm text-gray-500">${pet.birth_date ? new Date(pet.birth_date + 'T00:00:00').toLocaleDateString('es-ES') : 'Edad no especificada'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-sm text-gray-500">No tiene mascotas registradas.</p>'}
            </div>

            <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Citas Registradas</h3>
                ${appointments.length > 0 ? `
                    <div class="space-y-3">
                        ${appointments.slice(0, 5).map(apt => `
                            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-semibold text-gray-800">${new Date(apt.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <p class="text-sm text-gray-600">${apt.service || 'Servicio no especificado'} - ${apt.appointment_time}</p>
                                    </div>
                                    <span class="text-xs px-2 py-1 rounded-full ${
                                        apt.status === 'completada' ? 'bg-green-100 text-green-800' : 
                                        apt.status === 'confirmada' ? 'bg-blue-100 text-blue-800' : 
                                        'bg-yellow-100 text-yellow-800'
                                    }">${apt.status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-sm text-gray-500">No tiene citas registradas.</p>'}
            </div>
        </div>
    `;
};

// --- LÓGICA DEL MODAL DE REGISTRO DE CLIENTE (SIN CAMBIOS RELEVANTES EN ESTE CONTEXTO) ---
const openClientModal = () => clientModal.classList.remove('hidden');
const closeClientModal = () => {
    clientModal.classList.add('hidden');
    clientForm.reset();
};

const setupClientModal = () => {
    if (!clientDetailsModal) return;

    modalCloseBtn.addEventListener('click', closeModal);
    clientDetailsModal.addEventListener('click', (e) => {
        if (e.target === clientDetailsModal) closeModal();
    });
    
    editClientBtn.addEventListener('click', switchToEditMode);
    saveClientBtn.addEventListener('click', handleSaveClient);
    cancelEditClientBtn.addEventListener('click', switchToViewMode);
    modalAddPetBtnFooter.addEventListener('click', () => {
        if (currentClientId) openAddPetModal(currentClientId);
    });

    addClientButton.addEventListener('click', openClientModal);
    closeClientModalButton.addEventListener('click', closeClientModal);
    cancelClientButton.addEventListener('click', closeClientModal);
    clientModal.addEventListener('click', (e) => {
        if (e.target === clientModal) closeClientModal();
    });

    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = clientForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

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

        if (!clientData.firstName || !clientData.lastName || !clientData.phone) {
            if(clientFormMessage) {
                clientFormMessage.textContent = 'Los campos Nombre, Apellido y Teléfono son obligatorios.';
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Cliente';
            return;
        }

        if (clientData.email && !clientData.password) {
            if(clientFormMessage) {
                clientFormMessage.textContent = 'Si proporcionas un email, la contraseña es obligatoria.';
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Cliente';
            return;
        }

        const { success, error } = await registerClientFromDashboard(clientData);

        if (success) {
            if(clientFormMessage) {
                clientFormMessage.textContent = '¡Cliente registrado con éxito!';
                clientFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            setTimeout(async () => {
                closeClientModal();
                const updatedClients = await getClients();
                currentPage = 1;
                renderClientsTable(updatedClients);
            }, 1500);
        } else {
            if(clientFormMessage) {
                clientFormMessage.textContent = `Error: ${error.message}`;
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
        }

        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Cliente';
    });
};

// --- LÓGICA DEL MODAL DE AGREGAR MASCOTA (SIN CAMBIOS RELEVANTES EN ESTE CONTEXTO) ---
const openAddPetModal = (clientId) => {
    currentClientId = clientId;
    petOwnerIdInput.value = clientId;
    addPetFormMessage.classList.add('hidden');
    addPetForm.reset();
    petImagePreview.classList.add('hidden');
    petImagePreview.src = 'https://via.placeholder.com/100';
    photoFile = null;
    addPetModal.classList.remove('hidden');
    clientDetailsModal.classList.add('hidden');
};

const closeAddPetModal = () => {
    addPetModal.classList.add('hidden');
    addPetForm.reset();
    clientDetailsModal.classList.remove('hidden');
    if (currentClientId) {
        modalContentView.innerHTML = '<div class="text-center py-10 text-gray-500">Actualizando...</div>';
        getClientDetails(currentClientId).then(updatedDetails => {
            if (updatedDetails) {
                populateModal(updatedDetails);
            }
        });
    }
};

const setupAddPetModal = () => {
    if (!addPetModal) return;

    closeAddPetModalButton.addEventListener('click', closeAddPetModal);
    cancelAddPetButton.addEventListener('click', closeAddPetModal);
    addPetModal.addEventListener('click', (e) => {
        if (e.target === addPetModal) closeAddPetModal();
    });
    
    petPhotoInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            photoFile = file;
            petImagePreview.classList.remove('hidden');
            const reader = new FileReader();
            reader.onload = (e) => {
                petImagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    addPetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = addPetForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        const formData = new FormData(addPetForm);
        
        let imageUrl = null;
        
        if (photoFile) {
            const fileName = `public/${currentClientId || 'unknown'}/${Date.now()}_${photoFile.name}`;
            const { data, error: uploadError } = await supabase.storage
                .from('pet_galleries')
                .upload(fileName, photoFile);

            if (uploadError) {
                alert('Error al subir la imagen: ' + uploadError.message);
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Mascota';
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('pet_galleries')
                .getPublicUrl(fileName);
            imageUrl = publicUrl;
        }
        
        const petData = {
            owner_id: formData.get('owner_id'),
            name: formData.get('name'),
            breed: formData.get('breed'),
            sex: formData.get('sex'),
            observations: formData.get('observations'),
            birth_date: formData.get('birth_date') || null,
            weight: parseFloat(formData.get('weight')) || null,
            image_url: imageUrl,
            species: 'Perro'
        };

        if (!petData.name || !petData.breed) {
            alert('El nombre y la raza son obligatorios.');
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Mascota';
            return;
        }

        const { success, error } = await addPetFromDashboard(petData);

        if (success) {
            alert('¡Mascota registrada con éxito!');
            
            // --- INICIO DE CORRECCIÓN ---
            // Recargar la sección principal para actualizar el conteo de mascotas en la tabla
            const updatedClients = await getClients();
            currentPage = 1;
            renderClientsTable(updatedClients);
            // --- FIN DE CORRECCIÓN ---

            closeAddPetModal();
        } else {
            if(addPetFormMessage) {
                addPetFormMessage.textContent = `Error: ${error.message}`;
                addPetFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                addPetFormMessage.classList.remove('hidden');
            }
        }

        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Mascota';
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
            currentPage = 1;
            clientsTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">Buscando...</td></tr>`;
            const clients = searchTerm ? await searchClients(searchTerm) : await getClients();
            renderClientsTable(clients);
        }, 300);
    });

    clientsTableBody.addEventListener('click', async (event) => {
        const viewButton = event.target.closest('.view-details-btn');
        const scheduleButton = event.target.closest('.agendar-cita-btn');
        
        if (viewButton) {
            const clientId = viewButton.dataset.clientId;
            if (!clientId) return;

            currentClientId = clientId;
            openModal();
            modalContentView.innerHTML = '<div class="text-center py-10 text-gray-500">Cargando...</div>';
            
            const clientDetails = await getClientDetails(clientId);
            
            if (clientDetails) {
                populateModal(clientDetails);
            } else {
                modalContentView.innerHTML = '<div class="text-center py-10 text-red-500">Error al cargar los detalles del cliente.</div>';
            }
        } else if (scheduleButton) {
             const clientId = scheduleButton.dataset.clientId;
             const clientName = scheduleButton.dataset.clientName;
             openMultiAppointmentModal(clientId, clientName);
        }
    });

    modalCloseBtn?.addEventListener('click', closeModal);
    clientDetailsModal?.addEventListener('click', (event) => {
        if (event.target === clientDetailsModal) {
            closeModal();
        }
    });
    
    editClientBtn.addEventListener('click', switchToEditMode);
    saveClientBtn.addEventListener('click', handleSaveClient);
    cancelEditClientBtn.addEventListener('click', switchToViewMode); 
    modalAddPetBtnFooter.addEventListener('click', () => {
        if (currentClientId) openAddPetModal(currentClientId);
    });

    // --- LISTENERS DEL MODAL DE REGISTRO DE CLIENTE ---
    addClientButton.addEventListener('click', openClientModal);
    closeClientModalButton.addEventListener('click', closeClientModal);
    cancelClientButton.addEventListener('click', closeClientModal);
    clientModal.addEventListener('click', (e) => {
        if (e.target === clientModal) closeClientModal();
    });
    // --- FIN LISTENERS MODAL REGISTRO DE CLIENTE ---

    // --- LISTENERS DEL MODAL MÚLTIPLE (NUEVOS) ---
    closeMultiAptModalBtn?.addEventListener('click', closeMultiAppointmentModal);
    multiAppointmentModal?.addEventListener('click', (e) => {
        if (e.target === multiAppointmentModal) closeMultiAppointmentModal();
    });
    
    // ** FIX 2: Ambos botones, Next y Finish, llaman a la lógica de agendamiento **
    multiAptNextBtn?.addEventListener('click', handleNextStep);
    multiAptFinishBtn?.addEventListener('click', handleNextStep); // Reemplaza el listener de cierre directo
    
    multiAptBackBtn?.addEventListener('click', handleBackStep);
    multiAptDateInput?.addEventListener('change', () => multiAptDateMessage.classList.add('hidden'));
    
    multiAptDateInput?.addEventListener('change', () => {
        if (currentSchedulingStep === 3) {
            renderAvailableTimes(multiAptDateInput, multiAptTimeSelect);
        }
    });

    multiAptServiceSelect?.addEventListener('change', () => multiAptIndividualMessage.classList.add('hidden'));
    multiAptTimeSelect?.addEventListener('change', () => multiAptIndividualMessage.classList.add('hidden'));
};

// --- INICIALIZACIÓN DE LA SECCIÓN ---
const initializeClientsSection = async () => {
    if (isInitialized) return;
    isInitialized = true;

    if (headerTitle) {
        headerTitle.textContent = 'Gestión de Clientes';
    }
    
    // Cargar todos los clientes con sus mascotas para el modal
    allClientsWithPets = await getClientsWithPets();
    
    currentPage = 1;
    const initialClients = await getClients();
    renderClientsTable(initialClients);
    setupEventListeners();
    setupClientModal();
    setupAddPetModal();
};

document.addEventListener('DOMContentLoaded', initializeClientsSection);
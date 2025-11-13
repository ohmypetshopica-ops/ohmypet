// public/modules/dashboard/dashboard-appointments.js

import { supabase } from '../../core/supabase.js';
import { 
    getAppointments,
    updateAppointmentStatus, 
    getAppointmentPhotos, 
    uploadAppointmentPhoto, 
    uploadReceiptFile,
    getClientsWithPets,
    getBookedTimesForDashboard,
    addAppointmentFromDashboard,
    rescheduleAppointmentFromDashboard,
    deleteAppointment 
} from './dashboard.api.js';
import { addWeightRecord } from './pet-weight.api.js';
import { createAppointmentRow } from './dashboard.utils.js';

console.log("🚀 dashboard-appointments.js cargado y ejecutándose...");

// --- VARIABLES GLOBALES Y PAGINACIÓN ---
let allAppointments = [];
let clientsWithPets = [];
let currentAppointmentId = null;
let currentPetId = null;
let arrivalPhotoFile = null;
let departurePhotoFile = null;
let receiptFile = null;

let currentPage = 1;
const itemsPerPage = 10;
let totalAppointmentsCount = 0;

let appointmentToDeleteId = null; 


// --- OPCIONES DE SHAMPOO (NUEVO) ---
const SHAMPOO_OPTIONS = [
    'Shampoo General', 'Avena', 'Pelo Blanco', 'Pelo Oscuro', 'Clorixidina',
    'Hipoalergenico', 'Junior', 'Mascarilla', 'SHAMPO PROPIO' // <--- OPCIÓN AÑADIDA
];

// --- ELEMENTOS DEL DOM GENERAL ---
const appointmentsTableBody = document.querySelector('#appointments-table-body');
const searchInput = document.querySelector('#appointment-search-input');
const statusFilter = document.querySelector('#appointment-status-filter');
const dateFilter = document.querySelector('#appointment-date-filter');
const clearFiltersButton = document.querySelector('#clear-filters-button');
const paginationContainer = document.querySelector('#pagination-container');

const mainAlertMessage = document.querySelector('#main-alert-message');

// --- MODAL DE COMPLETAR CITA ---
const completionModal = document.querySelector('#completion-modal');
const completionModalSubtitle = document.querySelector('#completion-modal-subtitle');
const finalObservationsTextarea = document.querySelector('#final-observations-textarea');
const petWeightInput = document.querySelector('#pet-weight-input');
const servicePriceInput = document.querySelector('#service-price-input');
const paymentMethodSelect = document.querySelector('#payment-method-select');
// Elementos del Dropdown de Shampoo (NUEVOS)
const shampooSelectToggle = document.querySelector('#shampoo-select-toggle'); 
const shampooDropdownContent = document.querySelector('#shampoo-dropdown-content');
const shampooDisplayText = document.querySelector('#shampoo-display-text');
const cancelCompletionBtn = document.querySelector('#cancel-completion-btn');
const confirmCompletionBtn = document.querySelector('#confirm-completion-btn');
const saveDuringAppointmentBtn = document.querySelector('#save-during-appointment-btn');
const arrivalPhotoContainer = document.querySelector('#arrival-photo-container');
const departurePhotoContainer = document.querySelector('#departure-photo-container');
const receiptContainer = document.querySelector('#receipt-container');
const arrivalPhotoInput = document.querySelector('#arrival-photo-input');
const departurePhotoInput = document.querySelector('#departure-photo-input');
const receiptInput = document.querySelector('#receipt-input');
const uploadMessage = document.querySelector('#upload-message');

// --- MODAL DE AGENDAR CITA ---
const addAppointmentBtn = document.querySelector('#add-appointment-btn');
const addAppointmentModal = document.querySelector('#add-appointment-modal');
const addAppointmentForm = document.querySelector('#add-appointment-form');
const cancelAddAppointmentBtn = document.querySelector('#cancel-add-appointment-btn');
const petSelect = document.querySelector('#pet-select');
const newAppointmentDateInput = document.querySelector('#new-appointment-date');
const newAppointmentTimeSelect = document.querySelector('#new-appointment-time');
const addAppointmentMessage = document.querySelector('#add-appointment-message');
const clientSearchInputModal = document.querySelector('#client-search-input-modal');
const clientSearchResults = document.querySelector('#client-search-results');
const selectedClientIdInput = document.querySelector('#selected-client-id');

// --- ELEMENTOS DEL MODAL DE REPROGRAMACIÓN ---
const rescheduleModal = document.querySelector('#reschedule-modal');
const rescheduleForm = document.querySelector('#reschedule-form');
const rescheduleSubtitle = document.querySelector('#reschedule-subtitle');
const rescheduleClientNameInput = document.querySelector('#reschedule-client-name');
const reschedulePetNameInput = document.querySelector('#reschedule-pet-name');
const rescheduleDateInput = document.querySelector('#reschedule-date');
const rescheduleTimeSelect = document.querySelector('#reschedule-time');
const rescheduleServiceSelect = document.querySelector('#reschedule-service');
const rescheduleNotesTextarea = document.querySelector('#reschedule-notes');
const cancelRescheduleBtn = document.querySelector('#cancel-reschedule-btn');
const confirmRescheduleBtn = document.querySelector('#confirm-reschedule-btn');
const rescheduleMessage = document.querySelector('#reschedule-message');

let appointmentToRescheduleId = null;

// --- ELEMENTOS DEL MODAL DE BORRADO ---
const deleteConfirmModal = document.querySelector('#delete-confirm-modal');
const deletePetNameElement = document.querySelector('#delete-pet-name');
const confirmDeleteBtn = document.querySelector('#confirm-delete-btn');
const cancelDeleteBtn = document.querySelector('#cancel-delete-btn');


// --- INICIO: CÓDIGO AÑADIDO (Helpers de Alertas) ---

/**
 * Muestra la alerta principal en la página (fuera de los modales)
 * @param {string} message - El mensaje a mostrar.
 * @param {boolean} isError - true para alerta roja (error), false para verde (éxito).
 */
const showMainAlert = (message, isError = false) => {
    if (!mainAlertMessage) return;

    mainAlertMessage.textContent = message;
    if (isError) {
        mainAlertMessage.className = "rounded-lg p-4 text-sm font-medium mb-4 bg-red-100 text-red-700";
    } else {
        mainAlertMessage.className = "rounded-lg p-4 text-sm font-medium mb-4 bg-green-100 text-green-700";
    }
    mainAlertMessage.classList.remove('hidden');

    // Ocultar automáticamente después de 4 segundos
    setTimeout(() => {
        mainAlertMessage.classList.add('hidden');
    }, 4000);
};

/**
 * Muestra una alerta DENTRO del modal de reprogramación.
 */
const showRescheduleAlert = (message, isError = false) => {
    if (!rescheduleMessage) return;

    rescheduleMessage.textContent = message;
    if (isError) {
        rescheduleMessage.className = "rounded-lg p-4 text-sm font-medium mb-4 bg-red-100 text-red-700";
    } else {
        rescheduleMessage.className = "rounded-lg p-4 text-sm font-medium mb-4 bg-green-100 text-green-700";
    }
    rescheduleMessage.classList.remove('hidden');
};

/**
 * Oculta la alerta del modal de reprogramación.
 */
const hideRescheduleAlert = () => {
    if (rescheduleMessage) rescheduleMessage.classList.add('hidden');
};
// --- FIN: CÓDIGO AÑADIDO ---


// --- FUNCIONES SHAMPOO CHECKLIST (NUEVO) ---
const updateShampooDisplayText = () => {
    const checkedBoxes = document.querySelectorAll('#shampoo-dropdown-content .shampoo-checkbox:checked');
    const count = checkedBoxes.length;

    if (shampooDisplayText) {
        if (count === 0) {
            shampooDisplayText.textContent = 'Seleccionar...';
        } else if (count === 1) {
            shampooDisplayText.textContent = checkedBoxes[0].value;
        } else {
            shampooDisplayText.textContent = `${count} seleccionados`;
        }
    }
};

const renderShampooChecklist = (selectedShampoos = []) => {
    if (!shampooDropdownContent) return;

    shampooDropdownContent.innerHTML = SHAMPOO_OPTIONS.map(shampoo => {
        const sanitizedShampoo = shampoo.replace(/[^a-zA-Z0-9]/g, '-');
        const isChecked = selectedShampoos.some(s => s.trim() === shampoo);
        
        return `
            <label for="shampoo-${sanitizedShampoo}" class="flex items-center hover:bg-gray-50 p-1 rounded-md cursor-pointer">
                <input id="shampoo-${sanitizedShampoo}" type="checkbox" value="${shampoo}"
                    class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 shampoo-checkbox" ${isChecked ? 'checked' : ''}>
                <span class="ml-2 text-sm text-gray-700">${shampoo}</span>
            </label>
        `;
    }).join('');

    // Añadir listener para actualizar el texto del botón al cambiar un checkbox
    shampooDropdownContent.querySelectorAll('.shampoo-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateShampooDisplayText);
    });

    updateShampooDisplayText();
};

const getShampooList = () => {
    const checkedBoxes = document.querySelectorAll('#shampoo-dropdown-content .shampoo-checkbox:checked');
    const selectedShampoos = Array.from(checkedBoxes).map(cb => cb.value).join(',');
    return selectedShampoos || null;
};
// --- FIN FUNCIONES SHAMPOO CHECKLIST ---


// --- PAGINACIÓN ---
const renderPagination = (totalCount) => {
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4 mb-4">';
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage - 1}">Anterior</button>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage 
            ? 'bg-green-600 text-white' 
            : 'border border-gray-300 hover:bg-gray-100';
        paginationHTML += `<button class="page-btn px-3 py-1.5 text-sm rounded-lg transition-colors ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage + 1}">Siguiente</button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            currentPage = parseInt(btn.dataset.page);
            await loadAppointmentsAndRender();
        });
    });
};

// --- CARGA Y RENDERIZADO PRINCIPAL ---

const renderAppointmentsTable = (appointments) => {
    if (!appointmentsTableBody) return;
    appointmentsTableBody.innerHTML = appointments.length > 0
        ? appointments.map(createAppointmentRow).join('')
        : `<tr><td colspan="5" class="block md:table-cell text-center py-8 text-gray-500">No se encontraron citas.</td></tr>`;
};

const loadAppointmentsAndRender = async () => {
    appointmentsTableBody.innerHTML = `<tr><td colspan="5" class="block md:table-cell text-center py-8 text-gray-500">Cargando citas...</td></tr>`;

    const searchTerm = searchInput.value.trim();
    const selectedStatus = statusFilter.value;
    const selectedDate = dateFilter.value;

    const { data: appointments, count: totalCount } = await getAppointments(
        currentPage,
        itemsPerPage,
        searchTerm,
        selectedStatus,
        selectedDate
    );

    allAppointments = appointments;
    totalAppointmentsCount = totalCount;
    
    renderAppointmentsTable(appointments);
    renderPagination(totalCount);
};

const applyFiltersAndSearch = async () => {
    currentPage = 1;
    await loadAppointmentsAndRender();
};

const openAddAppointmentModal = () => {
    addAppointmentForm.reset();
    clientSearchInputModal.value = '';
    selectedClientIdInput.value = '';
    petSelect.innerHTML = '<option>Selecciona un cliente primero</option>';
    petSelect.disabled = true;
    newAppointmentTimeSelect.innerHTML = '<option>Selecciona una fecha</option>';
    newAppointmentTimeSelect.disabled = true;
    addAppointmentMessage.classList.add('hidden');
    clientSearchResults.classList.add('hidden');
    addAppointmentModal.classList.remove('hidden');
};

const closeAddAppointmentModal = () => {
    addAppointmentModal.classList.add('hidden');
};

const populatePetSelect = (clientId) => {
    const selectedClient = clientsWithPets.find(c => c.id === clientId);

    if (selectedClient && selectedClient.pets.length > 0) {
        petSelect.innerHTML = '<option value="">Selecciona una mascota...</option>';
        selectedClient.pets.forEach(pet => {
            const option = new Option(pet.name, pet.id);
            petSelect.add(option);
        });
        petSelect.disabled = false;
    } else {
        petSelect.innerHTML = '<option>Este cliente no tiene mascotas registradas</option>';
        petSelect.disabled = true;
    }
};

const renderClientSearchResults = (clients) => {
    if (clients.length === 0) {
        clientSearchResults.innerHTML = `<div class="p-3 text-sm text-gray-500">No se encontraron clientes.</div>`;
    } else {
        clientSearchResults.innerHTML = clients.map(client => {
            const displayName = (client.first_name && client.last_name) ? `${client.first_name} ${client.last_name}` : client.full_name;
            return `<div class="p-3 hover:bg-gray-100 cursor-pointer text-sm" data-client-id="${client.id}" data-client-name="${displayName}">${displayName}</div>`;
        }).join('');
    }
    clientSearchResults.classList.remove('hidden');
};


const renderAvailableTimes = async (dateInput, timeSelect) => {
    const selectedDate = dateInput.value;
    if (!selectedDate) {
        timeSelect.innerHTML = '<option>Selecciona una fecha</option>';
        timeSelect.disabled = true;
        return;
    }

    timeSelect.innerHTML = '<option>Cargando...</option>';
    const bookedTimes = await getBookedTimesForDashboard(selectedDate);
    const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
    
    timeSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
    hours.forEach(hour => {
        if (!bookedTimes.includes(hour)) {
            const option = new Option(hour, hour + ':00');
            timeSelect.add(option);
        }
    });
    timeSelect.disabled = false;
};

const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('clientId');
    const petId = urlParams.get('petId');

    if (clientId && petId) {
        openAddAppointmentModal();
        const client = clientsWithPets.find(c => c.id === clientId);
        if (client) {
            const clientName = (client.first_name && client.last_name) ? `${client.first_name} ${client.last_name}` : client.full_name;
            clientSearchInputModal.value = clientName;
            selectedClientIdInput.value = clientId;
            populatePetSelect(clientId);
            petSelect.value = petId;
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

const openRescheduleModal = async (appointmentId) => {
    const appointment = allAppointments.find(app => app.id === appointmentId);
    if (!appointment) return;

    appointmentToRescheduleId = appointmentId;

    const ownerProfile = appointment.profiles;
    let clientName = 'N/A';
    
    if (ownerProfile) {
        if (ownerProfile.first_name || ownerProfile.last_name) {
            clientName = `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim();
        } else if (ownerProfile.full_name) {
            clientName = ownerProfile.full_name;
        }
    }
    
    const petName = appointment.pets?.name || 'N/A';

    rescheduleClientNameInput.value = clientName;
    reschedulePetNameInput.value = petName;
    rescheduleDateInput.value = appointment.appointment_date;
    rescheduleServiceSelect.value = appointment.service;
    rescheduleNotesTextarea.value = appointment.notes || '';

    // Cargar horarios para la fecha actual
    await renderAvailableTimes(rescheduleDateInput, rescheduleTimeSelect);
    rescheduleTimeSelect.value = appointment.appointment_time;

    rescheduleModal.classList.remove('hidden');
};

const closeRescheduleModal = () => {
    rescheduleModal.classList.add('hidden');
    appointmentToRescheduleId = null;
    hideRescheduleAlert(); 
};

// --- INICIO: CÓDIGO ACTUALIZADO ---
const openDeleteModal = (appointmentId, petName) => {
    appointmentToDeleteId = appointmentId;
    deletePetNameElement.textContent = petName;
    
    // Limpiar mensajes de error anteriores
    const deleteModalText = deletePetNameElement.parentElement.querySelector('p');
    if (deleteModalText) { // Asegurarse de que el elemento exista
        const errorText = deleteModalText.querySelector('.error-text');
        if (errorText) {
            errorText.remove();
        }
    }
    
    deleteConfirmModal.classList.remove('hidden');
};

const closeDeleteModal = () => {
    appointmentToDeleteId = null;
    deleteConfirmModal.classList.add('hidden');
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Sí, Eliminar';
};
// --- FIN: CÓDIGO ACTUALIZADO ---

const initializeAddAppointmentModal = async () => {
    clientsWithPets = await getClientsWithPets();

    addAppointmentBtn.addEventListener('click', openAddAppointmentModal);
    cancelAddAppointmentBtn.addEventListener('click', closeAddAppointmentModal);
    addAppointmentModal.addEventListener('click', (e) => {
        if (e.target === addAppointmentModal) closeAddAppointmentModal();
    });

    clientSearchInputModal.addEventListener('input', () => {
        const searchTerm = clientSearchInputModal.value.toLowerCase();
        
        petSelect.innerHTML = '<option>Selecciona un cliente primero</option>';
        petSelect.disabled = true;
        selectedClientIdInput.value = '';

        if (searchTerm.length < 1) {
            clientSearchResults.classList.add('hidden');
            return;
        }

        const matchedClients = clientsWithPets.filter(client => {
            const fullName = ((client.first_name || '') + ' ' + (client.last_name || '')).toLowerCase();
            return fullName.includes(searchTerm);
        });

        renderClientSearchResults(matchedClients);
    });

    clientSearchResults.addEventListener('click', (e) => {
        const clientDiv = e.target.closest('[data-client-id]');
        if (clientDiv) {
            const clientId = clientDiv.dataset.clientId;
            const clientName = clientDiv.dataset.clientName;

            clientSearchInputModal.value = clientName;
            selectedClientIdInput.value = clientId;

            clientSearchResults.classList.add('hidden');
            populatePetSelect(clientId);
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!clientSearchInputModal.contains(e.target) && !clientSearchResults.contains(e.target)) {
            clientSearchResults.classList.add('hidden');
        }
    });

    newAppointmentDateInput.addEventListener('change', () => renderAvailableTimes(newAppointmentDateInput, newAppointmentTimeSelect));

    addAppointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = addAppointmentForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        const formData = new FormData(addAppointmentForm);
        const serviceValue = formData.get('service');
        const notesValue = formData.get('notes');
        
        const appointmentData = {
            user_id: formData.get('user_id'),
            pet_id: formData.get('pet_id'),
            appointment_date: formData.get('appointment_date'),
            appointment_time: formData.get('appointment_time'),
            service: serviceValue,
            notes: notesValue || null,
            status: 'confirmada'
        };

        if (!appointmentData.user_id || !appointmentData.pet_id || !appointmentData.appointment_date || !appointmentData.appointment_time || !appointmentData.service) {
            addAppointmentMessage.textContent = 'Error: Por favor, completa todos los campos obligatorios.';
            addAppointmentMessage.className = 'p-3 rounded-md bg-red-100 text-red-700 text-sm';
            addAppointmentMessage.classList.remove('hidden');
            submitButton.disabled = false;
            return;
        }

        const { success, error } = await addAppointmentFromDashboard(appointmentData);

        if (success) {
            showMainAlert('¡Cita agendada con éxito!', false); // <-- ALERTA DINÁMICA
            
            try {
                const appointmentDateTime = new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`);
                const now = new Date();

                if (appointmentDateTime >= now) {
                    const client = clientsWithPets.find(c => c.id === appointmentData.user_id);
                    if (client && client.phone) {
                        const pet = client.pets.find(p => p.id === appointmentData.pet_id);
                        const petName = pet ? pet.name : 'su mascota';
                        const appointmentDate = new Date(appointmentData.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        
                        const message = `¡Hola ${client.first_name}! 👋 Te confirmamos tu cita en OhMyPet:\n\n*Mascota:* ${petName}\n*Fecha:* ${appointmentDate}\n*Hora:* ${appointmentData.appointment_time}\n*Servicio:* ${appointmentData.service}\n\n¡Te esperamos! 🐾`;
                        
                        const whatsappUrl = `https://wa.me/51${client.phone}?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                    } else {
                        showMainAlert('Cita agendada, pero no se pudo notificar por WhatsApp (cliente sin teléfono).', true);
                    }
                } else {
                    showMainAlert('Cita agendada para una fecha pasada (sin notificación).', false);
                }
            } catch (e) {
                console.error('Error al intentar enviar WhatsApp:', e);
                showMainAlert('Cita agendada, pero falló al generar el mensaje de WhatsApp.', true);
            }

            closeAddAppointmentModal();
            await loadAppointmentsAndRender();
        } else {
            addAppointmentMessage.textContent = `Error: ${error.message}`;
            addAppointmentMessage.className = 'p-3 rounded-md bg-red-100 text-red-700 text-sm';
            addAppointmentMessage.classList.remove('hidden');
        }

        submitButton.disabled = false;
    });

    handleUrlParams();
};


const openCompletionModal = async (appointmentId, petName, petId) => {
    currentAppointmentId = appointmentId;
    currentPetId = petId;
    arrivalPhotoFile = null;
    departurePhotoFile = null;
    receiptFile = null;

    completionModalSubtitle.textContent = `Mascota: ${petName}`;
    finalObservationsTextarea.value = '';
    petWeightInput.value = '';
    servicePriceInput.value = '';
    paymentMethodSelect.value = '';
    

    uploadMessage.classList.add('hidden');

    const appointment = allAppointments.find(app => app.id == appointmentId);
    
    confirmCompletionBtn.classList.remove('hidden');
    saveDuringAppointmentBtn.textContent = '💾 Guardar Información (Continuar editando)';
    document.querySelector('#completion-modal h3').textContent = 'Completar Cita';

    completionModal.classList.remove('hidden');

    if (appointment) {
        finalObservationsTextarea.value = appointment.final_observations || '';
        petWeightInput.value = appointment.final_weight || '';
        servicePriceInput.value = appointment.service_price || '';
        
        // **** INICIO DE LA CORRECCIÓN 1 ****
        // Aseguramos que el valor (MAYÚSCULAS) coincida con el select
        paymentMethodSelect.value = (appointment.payment_method || '').toUpperCase();
        if (!paymentMethodSelect.value) {
             paymentMethodSelect.value = ""; // Si es null o "", vuelve a "Seleccionar..."
        }
        // **** FIN DE LA CORRECCIÓN 1 ****
        
        // --- Cargar y renderizar checkboxes (NUEVO) ---
        const selectedShampoos = appointment.shampoo_type ? appointment.shampoo_type.split(',').map(s => s.trim()) : [];
        renderShampooChecklist(selectedShampoos);
    } else {
        renderShampooChecklist([]); // Nuevo: Si no hay cita, renderiza vacío
    }

    await loadExistingPhotosAndReceipt(appointmentId);
};

const loadExistingPhotosAndReceipt = async (appointmentId) => {
    const photos = await getAppointmentPhotos(appointmentId);
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
    const departurePhoto = photos.find(p => p.photo_type === 'departure');

    const appointment = allAppointments.find(app => app.id == appointmentId);

    arrivalPhotoContainer.innerHTML = arrivalPhoto
        ? `<img src="${arrivalPhoto.image_url}" alt="Foto de llegada" class="w-full h-full object-cover rounded-lg">`
        : `<p class="text-sm text-gray-500">Clic para subir foto de llegada</p>`;

    departurePhotoContainer.innerHTML = departurePhoto
        ? `<img src="${departurePhoto.image_url}" alt="Foto de salida" class="w-full h-full object-cover rounded-lg">`
        : `<p class="text-sm text-gray-500">Clic para subir foto de salida</p>`;

    if (appointment && appointment.invoice_pdf_url) {
        receiptContainer.innerHTML = `<p class="text-sm text-green-600">✓ Boleta cargada</p>`;
    } else {
        receiptContainer.innerHTML = `<p class="text-sm text-gray-500">Clic para subir boleta (opcional)</p>`;
    }
};

const closeCompletionModal = () => {
    completionModal.classList.add('hidden');
    currentAppointmentId = null;
    currentPetId = null;
    arrivalPhotoFile = null;
    departurePhotoFile = null;
    receiptFile = null;

    confirmCompletionBtn.classList.remove('hidden');
    saveDuringAppointmentBtn.textContent = '💾 Guardar Información (Continuar editando)';
};


const initializePage = async () => {
    await loadAppointmentsAndRender();

    // --- EVENTOS DEL DROPDOWN DE SHAMPOO (NUEVO) ---
    shampooSelectToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        shampooDropdownContent?.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!shampooSelectToggle?.contains(e.target) && !shampooDropdownContent?.contains(e.target)) {
            shampooDropdownContent?.classList.add('hidden');
        }
    });
    // --- FIN EVENTOS DROPDOWN SHAMPOO ---

    searchInput?.addEventListener('input', applyFiltersAndSearch);
    statusFilter?.addEventListener('change', applyFiltersAndSearch);
    dateFilter?.addEventListener('change', applyFiltersAndSearch);
    clearFiltersButton?.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = '';
        dateFilter.value = '';
        applyFiltersAndSearch();
    });

    appointmentsTableBody?.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const row = button.closest('tr[data-appointment-id]');
        const appointmentId = row.dataset.appointmentId;

        if (action === 'confirmar' || action === 'rechazar') {
            const newStatus = action === 'confirmar' ? 'confirmada' : 'rechazada';
            const confirmationText = action === 'confirmar' ? '¿Confirmar esta cita y notificar al cliente por WhatsApp?' : '¿Rechazar esta cita?';
            
            if (confirm(confirmationText)) {
                
                if (action === 'confirmar') {
                    const appointment = allAppointments.find(app => app.id == appointmentId);

                    if (appointment && appointment.profiles && appointment.profiles.phone) {
                        const clientPhone = appointment.profiles.phone;
                        const petName = appointment.pets.name;
                        const appointmentDate = new Date(appointment.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        const appointmentTime = appointment.appointment_time;

                        const message = `¡Hola! 👋 Te confirmamos tu cita en OhMyPet:\n\n*Mascota:* ${petName}\n*Fecha:* ${appointmentDate}\n*Hora:* ${appointmentTime}\n\n¡Te esperamos! 🐾`;
                        
                        const whatsappUrl = `https://wa.me/51${clientPhone}?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');

                    } else {
                        showMainAlert('No se pudo encontrar el número de teléfono del cliente para notificar.', true);
                    }
                }

                const { success } = await updateAppointmentStatus(appointmentId, newStatus);
                if (success) {
                    showMainAlert(`Cita ${newStatus} exitosamente.`, false);
                    await loadAppointmentsAndRender();
                } else {
                    showMainAlert(`Error al ${action} la cita.`, true);
                }
            }
        } else if (action === 'reprogramar') {
            openRescheduleModal(appointmentId);
        } else if (action === 'completar') {
            const appointment = allAppointments.find(app => app.id == appointmentId);
            if (appointment) {
                const petName = appointment.pets?.name || 'N/A';
                const petId = appointment.pet_id;
                openCompletionModal(appointmentId, petName, petId);
            }
        } else if (action === 'eliminar') {
            const appointment = allAppointments.find(app => app.id == appointmentId);
            const petName = appointment?.pets?.name || 'esta cita';
            
            openDeleteModal(appointmentId, petName);
        }
    });

    cancelCompletionBtn?.addEventListener('click', closeCompletionModal);

    arrivalPhotoInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            arrivalPhotoFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                arrivalPhotoContainer.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
            };
            reader.readAsDataURL(file);
        }
    });

    departurePhotoInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            departurePhotoFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                departurePhotoContainer.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
            };
            reader.readAsDataURL(file);
        }
    });

    receiptInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            receiptFile = file;
            receiptContainer.innerHTML = `<p class="text-sm text-green-600">✓ ${file.name}</p>`;
        }
    });

    saveDuringAppointmentBtn?.addEventListener('click', async () => {
        if (!currentAppointmentId) return;

        saveDuringAppointmentBtn.disabled = true;
        uploadMessage.classList.remove('hidden');
        uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-blue-100 text-blue-700';
        uploadMessage.textContent = 'Guardando información...';

        try {
            if (arrivalPhotoFile) {
                uploadMessage.textContent = 'Subiendo foto de llegada...';
                await uploadAppointmentPhoto(currentAppointmentId, arrivalPhotoFile, 'arrival');
                arrivalPhotoFile = null;
            }

            if (departurePhotoFile) {
                uploadMessage.textContent = 'Subiendo foto de salida...';
                await uploadAppointmentPhoto(currentAppointmentId, departurePhotoFile, 'departure');
                departurePhotoFile = null;
            }

            if (receiptFile) {
                uploadMessage.textContent = 'Subiendo boleta...';
                await uploadReceiptFile(currentAppointmentId, receiptFile);
                receiptFile = null;
            }

            const observations = finalObservationsTextarea.value.trim();
            const weight = petWeightInput.value.trim();
            const price = servicePriceInput.value.trim();
            const paymentMethod = paymentMethodSelect.value;
            const shampooType = getShampooList(); // NEW: Read from checklist

            const updateData = {};
            if (observations) updateData.final_observations = observations;
            
            if (weight) updateData.final_weight = parseFloat(weight);
            if (price) updateData.service_price = parseFloat(price);
            
            if (paymentMethod) updateData.payment_method = paymentMethod.toUpperCase();

            if (shampooType) updateData.shampoo_type = shampooType; // NEW

            if (Object.keys(updateData).length > 0) {
                uploadMessage.textContent = 'Guardando datos adicionales...';
                await supabase
                    .from('appointments')
                    .update(updateData)
                    .eq('id', currentAppointmentId);
            }

            if (weight) {
                uploadMessage.textContent = 'Registrando peso...';
                await addWeightRecord(currentPetId, parseFloat(weight), currentAppointmentId);
            }

            uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-green-100 text-green-700';
            uploadMessage.textContent = '✓ Información guardada correctamente';

            setTimeout(async () => {
                closeCompletionModal();
                await loadAppointmentsAndRender();
            }, 1500);

        } catch (error) {
            uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
            uploadMessage.textContent = `Error: ${error.message}`;
        } finally {
            saveDuringAppointmentBtn.disabled = false;
        }
    });

    confirmCompletionBtn?.addEventListener('click', async () => {
        const weight = petWeightInput.value.trim();
        const price = servicePriceInput.value.trim();
        const paymentMethod = paymentMethodSelect.value;
        const shampooType = getShampooList(); // NEW: Read from checklist
        
        let missingFields = [];
        if (!price) missingFields.push('precio del servicio');
        if (!paymentMethod) missingFields.push('método de pago');

        if (missingFields.length > 0) {
            alert(`❌ Para completar la cita, debes agregar:\n\n• ${missingFields.join('\n• ')}\n\nPuedes usar el botón "Guardar Información" para ir agregando los datos durante la cita.`);
            return;
        }

        confirmCompletionBtn.disabled = true;
        confirmCompletionBtn.textContent = 'Procesando...';
        uploadMessage.classList.remove('hidden');
        uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-blue-100 text-blue-700';
        uploadMessage.textContent = 'Completando cita...';

        try {
            if (arrivalPhotoFile) {
                uploadMessage.textContent = 'Subiendo foto de llegada...';
                await uploadAppointmentPhoto(currentAppointmentId, arrivalPhotoFile, 'arrival');
            }
            if (departurePhotoFile) {
                uploadMessage.textContent = 'Subiendo foto de salida...';
                await uploadAppointmentPhoto(currentAppointmentId, departurePhotoFile, 'departure');
            }
            if (receiptFile) {
                uploadMessage.textContent = 'Subiendo boleta...';
                await uploadReceiptFile(currentAppointmentId, receiptFile);
            }

            if (weight) {
                uploadMessage.textContent = 'Registrando peso de la mascota...';
                await addWeightRecord(currentPetId, parseFloat(weight), currentAppointmentId);
            }

            uploadMessage.textContent = 'Guardando observaciones y completando cita...';
            const observations = finalObservationsTextarea.value.trim();
            
            const appointment = allAppointments.find(app => app.id === currentAppointmentId);
            const appointmentDate = appointment ? appointment.appointment_date : new Date().toISOString().split('T')[0];

            const { success } = await updateAppointmentStatus(currentAppointmentId, 'completada', {
                observations: observations,
                weight: weight ? parseFloat(weight) : undefined, 
                price: parseFloat(price),
                paymentMethod: paymentMethod.toUpperCase(), 
                shampoo: shampooType 
            });

            if (success) {
                uploadMessage.textContent = 'Actualizando fecha de último servicio...';
                const { error: petUpdateError } = await supabase
                    .from('pets')
                    .update({ last_grooming_date: appointmentDate })
                    .eq('id', currentPetId);

                if (petUpdateError) {
                    showMainAlert('Cita completada, pero hubo un error al actualizar la fecha del último baño en el perfil de la mascota.', true);
                    console.error('Error al actualizar last_grooming_date:', petUpdateError);
                } else {
                     showMainAlert('✓ Cita completada exitosamente', false); 
                }
                
                await loadAppointmentsAndRender();
                closeCompletionModal();
                
            } else {
                throw new Error('No se pudo actualizar el estado de la cita.');
            }

        } catch (error) {
            uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
            uploadMessage.textContent = `Error: ${error.message}`;
        } finally {
            confirmCompletionBtn.disabled = false;
            confirmCompletionBtn.textContent = '✓ Confirmar y Completar Cita';
        }
    });
    
    // --- LISTENERS PARA EL MODAL DE REPROGRAMACIÓN ---
    rescheduleDateInput?.addEventListener('change', () => renderAvailableTimes(rescheduleDateInput, rescheduleTimeSelect));
    cancelRescheduleBtn?.addEventListener('click', closeRescheduleModal);
    rescheduleModal?.addEventListener('click', (e) => {
        if (e.target === rescheduleModal) closeRescheduleModal();
    });

    confirmRescheduleBtn?.addEventListener('click', async () => {
        hideRescheduleAlert(); 
        if (!appointmentToRescheduleId || !rescheduleDateInput.value || !rescheduleTimeSelect.value) {
            showRescheduleAlert('Por favor, selecciona una nueva fecha y hora.', true); 
            return;
        }

        confirmRescheduleBtn.disabled = true;
        confirmRescheduleBtn.textContent = 'Guardando...';

        const updatedData = {
            appointment_date: rescheduleDateInput.value,
            appointment_time: rescheduleTimeSelect.value,
            service: rescheduleServiceSelect.value,
            notes: rescheduleNotesTextarea.value
        };

        const { success, error } = await rescheduleAppointmentFromDashboard(
            appointmentToRescheduleId,
            updatedData
        );

        if (success) {
            showRescheduleAlert('¡Cita reprogramada con éxito! La cita ha vuelto al estado "Pendiente".', false); 
            setTimeout(async () => {
                closeRescheduleModal();
                await loadAppointmentsAndRender();
            }, 2000); 
        } else {
            showRescheduleAlert(`Error al reprogramar: ${error.message}`, true); 
        }

        confirmRescheduleBtn.disabled = false;
        confirmRescheduleBtn.textContent = 'Confirmar Cambios';
    });
    
    // --- INICIO: CÓDIGO ACTUALIZADO (Listeners del modal de borrado) ---
    cancelDeleteBtn?.addEventListener('click', closeDeleteModal);
    deleteConfirmModal?.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) closeDeleteModal();
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
        if (!appointmentToDeleteId) return;

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = 'Eliminando...';

        const { success, error } = await deleteAppointment(appointmentToDeleteId);
        
        if (success) {
            showMainAlert('Cita eliminada exitosamente.', false); // <-- ALERTA DINÁMICA
            closeDeleteModal();
            await loadAppointmentsAndRender(); // Recargar la tabla
        } else {
            // Mostrar error dentro del modal
            const deleteModalText = deletePetNameElement.parentElement.querySelector('p');
            if (deleteModalText) { 
                const existingError = deleteModalText.querySelector('.error-text');
                if (existingError) {
                    existingError.textContent = `Error: ${error.message}`;
                } else {
                    deleteModalText.innerHTML += `<br><strong class="text-red-700 error-text">Error: ${error.message}</strong>`;
                }
            }
            // Reactivamos el botón en el modal
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Sí, Eliminar';
        }
    });
    // --- FIN: CÓDIGO ACTUALIZADO ---
    
    initializeAddAppointmentModal();
};

initializePage();
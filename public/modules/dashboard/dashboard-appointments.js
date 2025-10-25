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
    rescheduleAppointmentFromDashboard 
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

// --- ELEMENTOS DEL DOM GENERAL ---
const appointmentsTableBody = document.querySelector('#appointments-table-body');
const searchInput = document.querySelector('#appointment-search-input');
const statusFilter = document.querySelector('#appointment-status-filter');
const dateFilter = document.querySelector('#appointment-date-filter');
const clearFiltersButton = document.querySelector('#clear-filters-button');
const paginationContainer = document.querySelector('#pagination-container');

// --- MODAL DE COMPLETAR CITA ---
const completionModal = document.querySelector('#completion-modal');
const completionModalSubtitle = document.querySelector('#completion-modal-subtitle');
const finalObservationsTextarea = document.querySelector('#final-observations-textarea');
const petWeightInput = document.querySelector('#pet-weight-input');
const servicePriceInput = document.querySelector('#service-price-input');
const paymentMethodSelect = document.querySelector('#payment-method-select');
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
const rescheduleSubtitle = document.querySelector('#reschedule-subtitle');
const rescheduleDateInput = document.querySelector('#reschedule-date');
const rescheduleTimeOptions = document.querySelector('#reschedule-time-options');
const cancelRescheduleBtn = document.querySelector('#cancel-reschedule-btn');
const confirmRescheduleBtn = document.querySelector('#confirm-reschedule-btn');

let appointmentToRescheduleId = null;
let selectedRescheduleTime = null;


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
        : `<tr><td colspan="5" class="text-center py-8 text-gray-500">No se encontraron citas.</td></tr>`;
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


const renderAvailableTimes = async () => {
    const selectedDate = newAppointmentDateInput.value;
    if (!selectedDate) {
        newAppointmentTimeSelect.innerHTML = '<option>Selecciona una fecha</option>';
        newAppointmentTimeSelect.disabled = true;
        return;
    }

    newAppointmentTimeSelect.innerHTML = '<option>Cargando...</option>';
    const bookedTimes = await getBookedTimesForDashboard(selectedDate);
    const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
    
    newAppointmentTimeSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
    hours.forEach(hour => {
        if (!bookedTimes.includes(hour)) {
            const option = new Option(hour, hour + ':00');
            newAppointmentTimeSelect.add(option);
        }
    });
    newAppointmentTimeSelect.disabled = false;
};

// <<< INICIO: CÓDIGO ACTUALIZADO >>>
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
        // Limpiar los parámetros de la URL para evitar que el modal se abra al recargar
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};
// <<< FIN: CÓDIGO ACTUALIZADO >>>

const openRescheduleModal = (appointmentId, petName, clientName) => {
    appointmentToRescheduleId = appointmentId;
    selectedRescheduleTime = null;

    rescheduleSubtitle.textContent = `Reprogramando para ${petName} de ${clientName}`;
    rescheduleDateInput.value = '';
    
    rescheduleTimeOptions.innerHTML = `<p class="col-span-full text-center text-sm text-gray-500">Selecciona una fecha para ver los horarios.</p>`;
    confirmRescheduleBtn.disabled = true;
    
    rescheduleModal.classList.remove('hidden');
};

const closeRescheduleModal = () => {
    rescheduleModal.classList.add('hidden');
    appointmentToRescheduleId = null;
    selectedRescheduleTime = null;
};

const renderRescheduleTimeOptions = async () => {
    const selectedDate = rescheduleDateInput.value;
    if (!selectedDate) {
        rescheduleTimeOptions.innerHTML = `<p class="col-span-full text-center text-sm text-gray-500">Selecciona una fecha para ver los horarios.</p>`;
        return;
    }
    
    rescheduleTimeOptions.innerHTML = `<p class="col-span-full text-center text-sm text-gray-500">Cargando disponibilidad...</p>`;
    const bookedTimes = await getBookedTimesForDashboard(selectedDate);
    const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

    rescheduleTimeOptions.innerHTML = '';
    selectedRescheduleTime = null;
    confirmRescheduleBtn.disabled = true;

    hours.forEach(hour => {
        const isBooked = bookedTimes.includes(hour);
        const btn = document.createElement("button");
        btn.textContent = hour;
        btn.disabled = isBooked;
        btn.className = isBooked
            ? "py-2 px-3 rounded-lg text-sm bg-gray-200 text-gray-400 cursor-not-allowed line-through"
            : "py-2 px-3 rounded-lg text-sm bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-medium transition-colors";

        if (!isBooked) {
            btn.addEventListener('click', () => {
                rescheduleTimeOptions.querySelectorAll('button').forEach(b => b.classList.remove("bg-green-700", "text-white"));
                btn.classList.add("bg-green-700", "text-white");
                selectedRescheduleTime = hour + ':00';
                confirmRescheduleBtn.disabled = false;
            });
        }
        rescheduleTimeOptions.appendChild(btn);
    });
};

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

    newAppointmentDateInput.addEventListener('change', renderAvailableTimes);

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
            alert('Por favor, completa todos los campos obligatorios (Cliente, Mascota, Fecha, Hora y Servicio).');
            submitButton.disabled = false;
            return;
        }

        const { success, error } = await addAppointmentFromDashboard(appointmentData);

        if (success) {
            alert('¡Cita agendada con éxito!');
            
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
                        alert('La cita fue agendada, pero no se pudo notificar por WhatsApp porque el cliente no tiene un número de teléfono registrado.');
                    }
                } else {
                    alert('La cita fue agendada para una fecha pasada. No se envió notificación por WhatsApp.');
                }
            } catch (e) {
                console.error('Error al intentar enviar WhatsApp:', e);
                alert('La cita fue agendada, pero ocurrió un error al intentar generar el mensaje de WhatsApp.');
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
    
    // ========================================
    // --- INICIO DE LA CORRECCIÓN ---
    if (appointment && appointment.status === 'completada') {
        // MODO EDICIÓN: Ocultamos el botón de completar y cambiamos el texto del otro.
        confirmCompletionBtn.classList.add('hidden');
        saveDuringAppointmentBtn.textContent = '💾 Guardar Cambios';
        document.querySelector('#completion-modal h3').textContent = 'Editar Detalles de Cita';
    } else {
        // MODO COMPLETAR: Mostramos ambos botones con su texto original.
        confirmCompletionBtn.classList.remove('hidden');
        saveDuringAppointmentBtn.textContent = '💾 Guardar Información (Continuar editando)';
        document.querySelector('#completion-modal h3').textContent = 'Completar Cita';
    }
    // --- FIN DE LA CORRECCIÓN ---
    // ========================================

    completionModal.classList.remove('hidden');

    if (appointment) {
        finalObservationsTextarea.value = appointment.final_observations || '';
        petWeightInput.value = appointment.final_weight || '';
        servicePriceInput.value = appointment.service_price || '';
        paymentMethodSelect.value = appointment.payment_method || '';
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

    // ========================================
    // --- INICIO: RESETEAR BOTONES ---
    // Nos aseguramos de que los botones vuelvan a su estado original al cerrar el modal.
    confirmCompletionBtn.classList.remove('hidden');
    saveDuringAppointmentBtn.textContent = '💾 Guardar Información (Continuar editando)';
    // --- FIN: RESETEAR BOTONES ---
    // ========================================
};


const initializePage = async () => {
    await loadAppointmentsAndRender();

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
                        alert('No se pudo encontrar el número de teléfono del cliente para notificar.');
                    }
                }

                const { success } = await updateAppointmentStatus(appointmentId, newStatus);
                if (success) {
                    await loadAppointmentsAndRender();
                } else {
                    alert(`Error al ${action} la cita.`);
                }
            }
        } else if (action === 'reprogramar') {
            const appointment = allAppointments.find(app => app.id == appointmentId);
            if (appointment) {
                const petName = appointment.pets?.name || 'N/A';
                const clientProfile = appointment.profiles;
                const clientName = (clientProfile?.first_name && clientProfile?.last_name) 
                    ? `${clientProfile.first_name} ${clientProfile.last_name}` 
                    : clientProfile?.full_name || 'Cliente';
                openRescheduleModal(appointmentId, petName, clientName);
            }
        // ========================================
        // --- INICIO: MANEJO DEL BOTÓN DE EDICIÓN ---
        } else if (action === 'completar' || action === 'edit-completed') {
            const appointment = allAppointments.find(app => app.id == appointmentId);
            if (appointment) {
                const petName = appointment.pets?.name || 'N/A';
                const petId = appointment.pet_id;
                openCompletionModal(appointmentId, petName, petId);
            }
        }
        // --- FIN: MANEJO DEL BOTÓN DE EDICIÓN ---
        // ========================================
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

            const updateData = {};
            if (observations) updateData.final_observations = observations;
            
            if (weight) updateData.final_weight = parseFloat(weight);
            if (price) updateData.service_price = parseFloat(price);
            if (paymentMethod) updateData.payment_method = paymentMethod;

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

            // ========================================
            // --- INICIO DE LA CORRECCIÓN ---
            setTimeout(async () => {
                closeCompletionModal();
                await loadAppointmentsAndRender();
            }, 1500);
            // --- FIN DE LA CORRECCIÓN ---
            // ========================================

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
                paymentMethod: paymentMethod
            });

            if (success) {
                uploadMessage.textContent = 'Actualizando fecha de último servicio...';
                const { error: petUpdateError } = await supabase
                    .from('pets')
                    .update({ last_grooming_date: appointmentDate })
                    .eq('id', currentPetId);

                if (petUpdateError) {
                    alert('La cita se completó, pero hubo un error al actualizar la fecha del último baño en el perfil de la mascota.');
                    console.error('Error al actualizar last_grooming_date:', petUpdateError);
                }
                
                await loadAppointmentsAndRender();
                closeCompletionModal();
                alert('✓ Cita completada exitosamente');
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
    rescheduleDateInput?.addEventListener('change', renderRescheduleTimeOptions);
    cancelRescheduleBtn?.addEventListener('click', closeRescheduleModal);
    rescheduleModal?.addEventListener('click', (e) => {
        if (e.target === rescheduleModal) closeRescheduleModal();
    });

    confirmRescheduleBtn?.addEventListener('click', async () => {
        if (!appointmentToRescheduleId || !rescheduleDateInput.value || !selectedRescheduleTime) {
            alert('Por favor, selecciona una nueva fecha y hora.');
            return;
        }

        confirmRescheduleBtn.disabled = true;
        confirmRescheduleBtn.textContent = 'Guardando...';

        const { success, error } = await rescheduleAppointmentFromDashboard(
            appointmentToRescheduleId,
            rescheduleDateInput.value,
            selectedRescheduleTime
        );

        if (success) {
            alert('¡Cita reprogramada con éxito! La cita ha vuelto al estado "Pendiente" y necesita ser re-confirmada.');
            closeRescheduleModal();
            await loadAppointmentsAndRender(); // Recargar la tabla
        } else {
            alert(`Error al reprogramar: ${error.message}`);
        }

        confirmRescheduleBtn.disabled = false;
        confirmRescheduleBtn.textContent = 'Confirmar';
    });
    
    initializeAddAppointmentModal();
};

initializePage();
// public/modules/employee/employee-appointments.js
// Módulo de gestión de citas

import { state, updateState } from './employee-state.js';
import { getClientsWithPets, getBookedTimesForDashboard, addAppointmentFromDashboard, uploadAppointmentPhoto, uploadReceiptFile, updateAppointmentStatus } from '../dashboard/dashboard.api.js';
import { supabase } from '../../core/supabase.js';
import { addWeightRecord } from '../dashboard/pet-weight.api.js';

// Elementos del DOM
let appointmentsList;
let addAppointmentBtnEmployee, addAppointmentModal, addAppointmentForm, cancelAddAppointmentBtn;
let petSelect, newAppointmentDateInput, newAppointmentTimeSelect, addAppointmentMessage;
let clientSearchInputModal, clientSearchResults, selectedClientIdInput;

// Modal de completar cita (Se mantienen las referencias, pero no se usarán en esta vista)
let completionModal, beforeImageInput, beforeImagePreview, afterImageInput, afterImagePreview;
let receiptInput, receiptContainer, finalObservationsTextarea, uploadMessage;
let cancelCompletionBtn, confirmCompletionBtn;
let currentAppointmentToComplete = null;

// NUEVOS ELEMENTOS PARA LA VISTA DE DETALLES
let appointmentsListView; // Contenedor de la lista principal
let appointmentDetailsView; // Contenedor de la vista de detalle
let backToAppointmentsListBtn; // Botón para volver
let appointmentDetailsContent; // Contenedor del contenido del detalle

// NUEVOS INPUTS DEL MODAL DE COMPLETAR CITA
let servicePriceInput;
let petWeightInput;
let paymentMethodSelect;

export const initAppointmentElements = () => {
    appointmentsList = document.getElementById('appointments-list');
    
    // Inicialización de Vistas
    appointmentsListView = document.getElementById('appointments-list-view'); 
    appointmentDetailsView = document.getElementById('appointment-details-view');
    appointmentDetailsContent = document.getElementById('appointment-details-content');
    backToAppointmentsListBtn = document.getElementById('back-to-appointments-list-btn');


    addAppointmentBtnEmployee = document.querySelector('#add-appointment-btn-employee');
    addAppointmentModal = document.querySelector('#add-appointment-modal-employee');
    addAppointmentForm = document.querySelector('#add-appointment-form-employee');
    cancelAddAppointmentBtn = document.querySelector('#cancel-add-appointment-btn-employee');
    petSelect = document.querySelector('#pet-select-employee');
    newAppointmentDateInput = document.querySelector('#new-appointment-date-employee');
    newAppointmentTimeSelect = document.querySelector('#new-appointment-time-employee');
    addAppointmentMessage = document.querySelector('#add-appointment-message-employee');
    clientSearchInputModal = document.querySelector('#client-search-input-modal-employee');
    clientSearchResults = document.querySelector('#client-search-results-employee');
    selectedClientIdInput = document.querySelector('#selected-client-id-employee');
    
    // Modal de completar cita (mantener por si se usa en otra función en el futuro)
    completionModal = document.querySelector('#completion-modal-employee');
    beforeImageInput = document.querySelector('#before-image-input');
    beforeImagePreview = document.querySelector('#before-image-preview');
    afterImageInput = document.querySelector('#after-image-input');
    afterImagePreview = document.querySelector('#after-image-preview');
    receiptInput = document.querySelector('#receipt-input');
    receiptContainer = document.querySelector('#receipt-container');
    finalObservationsTextarea = document.querySelector('#final-observations-textarea');
    uploadMessage = document.querySelector('#upload-message');
    cancelCompletionBtn = document.querySelector('#cancel-completion-btn');
    confirmCompletionBtn = document.querySelector('#confirm-completion-btn');

    // Inicializar nuevos inputs
    servicePriceInput = document.getElementById('service-price-input');
    petWeightInput = document.getElementById('pet-weight-input');
    paymentMethodSelect = document.getElementById('payment-method-select');
};

const showAppointmentsList = () => {
    appointmentsListView?.classList.remove('hidden');
    appointmentDetailsView?.classList.add('hidden');
};

const fetchLastCompletedAppointment = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`appointment_date, final_observations, final_weight, service`)
        .eq('pet_id', petId)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
        return null;
    }
    return data;
};

const fetchPetDetails = async (petId) => {
    const { data, error } = await supabase
        .from('pets')
        .select(`observations`)
        .eq('id', petId)
        .single();
        
    if (error && error.code !== 'PGRST116') {
        return null;
    }
    return data;
};

const openAppointmentDetails = async (appointmentId) => {
    const currentAppointment = state.allAppointments.find(app => app.id === appointmentId);
    if (!currentAppointment) return;
    
    const petId = currentAppointment.pet_id;
    
    // 1. Mostrar vista de detalle e indicador de carga inmediatamente
    appointmentsListView?.classList.add('hidden');
    appointmentDetailsView?.classList.remove('hidden');
    appointmentDetailsContent.innerHTML = '<p class="text-center text-gray-500 py-8">Cargando detalles de historial...</p>';

    // 2. Fetch de datos en paralelo
    const [lastCompleted, petDetails] = await Promise.all([
        fetchLastCompletedAppointment(petId),
        fetchPetDetails(petId)
    ]);
    
    const ownerName = currentAppointment.profiles?.first_name 
        ? `${currentAppointment.profiles.first_name} ${currentAppointment.profiles.last_name || ''}`
        : currentAppointment.profiles?.full_name || 'N/A';
        
    const petName = currentAppointment.pets?.name || 'N/A';
    
    // Obtenemos el perfil completo del dueño (que ya está en la caché de clientes)
    const clientProfile = state.allClients.find(c => c.id === currentAppointment.user_id);
    
    const petImage = currentAppointment.pets?.image_url 
        ? currentAppointment.pets.image_url 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(petName || 'M')}&background=10B981&color=FFFFFF`;
    
    const statusClass = currentAppointment.status === 'confirmada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    const statusText = currentAppointment.status.charAt(0).toUpperCase() + currentAppointment.status.slice(1);
    
    appointmentDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg border border-gray-200">
            <h4 class="text-2xl font-bold text-gray-800 mb-4">Detalles de Cita</h4>
            <div class="flex items-center space-x-4 mb-4">
                <img src="${petImage}" alt="${petName}" class="w-16 h-16 rounded-full object-cover flex-shrink-0">
                <div>
                    <p class="font-bold text-xl text-gray-800">${petName}</p>
                    <p class="text-sm text-gray-600">Cliente: ${ownerName}</p>
                    <p class="text-sm text-gray-600">Teléfono: <a href="tel:${clientProfile?.phone || ''}" class="text-blue-600">${clientProfile?.phone || 'N/A'}</a></p>
                </div>
            </div>
            
            <div class="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <h5 class="text-md font-semibold text-gray-800 mb-2">Cita Programada</h5>
                <div class="grid grid-cols-2 gap-y-2 text-sm">
                    <p class="col-span-2"><strong>Servicio:</strong> ${currentAppointment.service || 'N/A'}</p>
                    <p><strong>Fecha:</strong> ${currentAppointment.appointment_date}</p>
                    <p><strong>Hora:</strong> ${currentAppointment.appointment_time.slice(0, 5)}</p>
                    <p class="col-span-2"><strong>Estado:</strong> <span class="font-semibold ${statusClass} px-2 py-0.5 rounded">${statusText}</span></p>
                    <p class="col-span-2 mt-2"><strong>Instrucciones:</strong> ${currentAppointment.notes || 'Ninguna instrucción inicial.'}</p>
                </div>
            </div>

            <div class="mb-6 p-4 rounded-xl border border-yellow-200 bg-yellow-50">
                <h5 class="text-sm font-semibold text-yellow-700 mb-1">Observaciones Permanentes (Mascota)</h5>
                <p class="text-sm text-gray-800">${petDetails?.observations || 'No hay observaciones permanentes registradas.'}</p>
            </div>
            
            <div class="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <h5 class="text-sm font-semibold text-gray-700 mb-2">Historial - Último Servicio Completo</h5>
                ${lastCompleted ? `
                    <div class="space-y-1 text-sm">
                        <p><strong>Fecha:</strong> ${lastCompleted.appointment_date} (${lastCompleted.service})</p>
                        <p><strong>Peso Final:</strong> ${lastCompleted.final_weight ? `${lastCompleted.final_weight} kg` : 'N/A'}</p>
                        <p><strong>Observaciones:</strong> ${lastCompleted.final_observations || 'Sin observaciones finales.'}</p>
                    </div>
                ` : '<p class="text-sm text-gray-600">No se encontró historial de citas completadas.</p>'}
            </div>

            <button id="detail-complete-btn" data-appointment-id="${appointmentId}"
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors mt-6">
                ✓ Completar Cita
            </button>
        </div>
    `;
    
    // Wire up the new button to the existing modal logic
    document.getElementById('detail-complete-btn')?.addEventListener('click', (e) => {
        // Establecer el ID de la cita actual
        currentAppointmentToComplete = e.target.dataset.appointmentId; 
        openCompletionModal(e.target.dataset.appointmentId);
    });
};


export const setupAppointmentListeners = () => {
    addAppointmentBtnEmployee?.addEventListener('click', openAddAppointmentModal);
    cancelAddAppointmentBtn?.addEventListener('click', closeAddAppointmentModal);
    addAppointmentForm?.addEventListener('submit', handleAddAppointment);
    
    clientSearchInputModal?.addEventListener('input', handleClientSearchInModal);
    newAppointmentDateInput?.addEventListener('change', handleDateChange);
    
    // Listener para volver a la lista
    backToAppointmentsListBtn?.addEventListener('click', showAppointmentsList);
    
    // Modified: Clicking anywhere on the list item triggers the detail view
    appointmentsList?.addEventListener('click', (e) => {
        const item = e.target.closest('.appointment-list-item');
        if (item) {
            // Abrir la vista de detalle
            openAppointmentDetails(item.dataset.appointmentId);
        }
    });
    
    // Listeners del modal de completar cita
    cancelCompletionBtn?.addEventListener('click', closeCompletionModal);
    // Se añade un listener para los nuevos campos si fuera necesario validación en tiempo real
    
    confirmCompletionBtn?.addEventListener('click', handleCompleteAppointment);
    
    beforeImageInput?.addEventListener('change', (e) => handleImagePreview(e, beforeImagePreview));
    afterImageInput?.addEventListener('change', (e) => handleImagePreview(e, afterImagePreview));
};

const extractNotes = (app) => {
    let serviceDisplay = app.service || 'Servicio general';
    let notesDisplay = '';

    if (app.notes) {
        notesDisplay = app.notes;
    } else if (app.service?.includes('. Notas:')) {
        const parts = app.service.split('. Notas:');
        serviceDisplay = parts[0].trim();
        notesDisplay = parts.length > 1 ? parts[1].trim() : '';
    }

    return { serviceDisplay, notesDisplay };
};

export const renderConfirmedAppointments = () => {
    if (!appointmentsList) return;
    
    // Filtrar para mostrar SOLO confirmadas y pendientes
    const workingAppointments = state.allAppointments
        .filter(app => app.status === 'confirmada' || app.status === 'pendiente') 
        .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`) - new Date(`${b.appointment_date}T${b.appointment_time}`));

    if (workingAppointments.length === 0) {
        appointmentsList.innerHTML = `<p class="text-center text-gray-500 mt-8">No hay citas pendientes o confirmadas.</p>`;
        return;
    }
    
    appointmentsList.innerHTML = workingAppointments.map(app => {
        const { serviceDisplay, notesDisplay } = extractNotes(app);

        // Lógica de Avatar/Imagen
        const petImage = app.pets?.image_url 
            ? app.pets.image_url 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(app.pets?.name || 'M')}&background=10B981&color=FFFFFF`;
        
        // Información del dueño
        const ownerFirstName = app.profiles?.first_name || app.profiles?.full_name || 'Dueño';

        // Estilos para el estado
        const statusClass = app.status === 'confirmada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        const statusText = app.status === 'confirmada' ? 'Confirmada' : 'Pendiente';

        return `
            <div class="appointment-list-item bg-white p-4 rounded-lg border hover:bg-gray-50 transition-colors duration-200 cursor-pointer" data-appointment-id="${app.id}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-3">
                        <img src="${petImage}" alt="${app.pets.name}" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
                        <div class="min-w-0">
                            <p class="font-bold text-lg text-gray-800 truncate">${app.pets.name} <span class="text-sm text-gray-500 font-normal">(${ownerFirstName})</span></p>
                            <p class="text-sm text-gray-600">${serviceDisplay}</p>
                            ${notesDisplay ? `<p class="text-xs text-red-500 mt-1"><strong>Instrucciones:</strong> ${notesDisplay}</p>` : ''}
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="font-bold text-base text-gray-800">${app.appointment_date}</p>
                        <p class="text-sm text-gray-600">${app.appointment_time.slice(0, 5)}</p>
                    </div>
                </div>
                
                <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span class="text-xs font-semibold ${statusClass} px-3 py-1 rounded-full">
                        ${statusText}
                    </span>
                    
                    <button class="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

const openAddAppointmentModal = async () => {
    state.clientsWithPets = await getClientsWithPets();
    addAppointmentModal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeAddAppointmentModal = () => {
    addAppointmentModal?.classList.add('hidden');
    document.body.style.overflow = '';
    addAppointmentForm?.reset();
    addAppointmentMessage?.classList.add('hidden');
    selectedClientIdInput.value = '';
    petSelect.innerHTML = '<option value="">Selecciona una mascota</option>';
};

const handleClientSearchInModal = (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length < 2) {
        clientSearchResults.classList.add('hidden');
        return;
    }
    
    const matched = state.clientsWithPets.filter(c => 
        `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term)
    );
    
    clientSearchResults.innerHTML = matched.map(c => 
        `<div class="p-2 cursor-pointer hover:bg-gray-100" data-client-id="${c.id}" data-client-name="${c.first_name || ''} ${c.last_name || ''}">${c.first_name || ''} ${c.last_name || ''}</div>`
    ).join('');
    clientSearchResults.classList.remove('hidden');
    
    clientSearchResults.querySelectorAll('[data-client-id]').forEach(item => {
        item.addEventListener('click', () => {
            selectedClientIdInput.value = item.dataset.clientId;
            clientSearchInputModal.value = item.dataset.clientName;
            clientSearchResults.classList.add('hidden');
            
            const client = state.clientsWithPets.find(c => c.id === item.dataset.clientId);
            if (client && client.pets) {
                petSelect.innerHTML = '<option value="">Selecciona una mascota</option>' +
                    client.pets.map(pet => `<option value="${pet.id}">${pet.name}</option>`).join('');
            }
        });
    });
};

const handleDateChange = async () => {
    const selectedDate = newAppointmentDateInput.value;
    if (!selectedDate) return;
    
    const bookedTimes = await getBookedTimesForDashboard(selectedDate);
    const availableHours = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30", "16:00"
    ];
    
    newAppointmentTimeSelect.innerHTML = availableHours
        .filter(time => !bookedTimes.includes(time))
        .map(time => `<option value="${time}">${time}</option>`)
        .join('');
};

const handleAddAppointment = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(addAppointmentForm);
    const appointmentData = {
        pet_id: formData.get('pet_id'),
        appointment_date: formData.get('appointment_date'),
        appointment_time: formData.get('appointment_time'),
        service: formData.get('service'),
        notes: formData.get('notes') || null,
        status: 'confirmada'
    };
    
    const result = await addAppointmentFromDashboard(appointmentData);
    
    if (result.success) {
        addAppointmentMessage.textContent = '✅ Cita agendada con éxito';
        addAppointmentMessage.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700';
        addAppointmentMessage.classList.remove('hidden');
        
        // Recargar citas
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*, pets(name), profiles(first_name, last_name)')
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true });
        
        if (appointments) {
            updateState('allAppointments', appointments);
            renderConfirmedAppointments();
        }
        
        setTimeout(() => {
            closeAddAppointmentModal();
        }, 1500);
    } else {
        addAppointmentMessage.textContent = `❌ ${result.error?.message || 'Error al agendar cita'}`;
        addAppointmentMessage.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        addAppointmentMessage.classList.remove('hidden');
    }
};

// Funciones para completar cita
const openCompletionModal = (appointmentId) => {
    currentAppointmentToComplete = appointmentId;

    // Obtener cita para prellenar precio y peso si existen
    const appointment = state.allAppointments.find(app => app.id === appointmentId);
    if (appointment) {
        servicePriceInput.value = appointment.service_price || '';
        petWeightInput.value = appointment.final_weight || '';
        paymentMethodSelect.value = appointment.payment_method || '';
        finalObservationsTextarea.value = appointment.final_observations || '';
    } else {
         servicePriceInput.value = '';
         petWeightInput.value = '';
         paymentMethodSelect.value = '';
         finalObservationsTextarea.value = '';
    }

    completionModal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeCompletionModal = () => {
    completionModal?.classList.add('hidden');
    document.body.style.overflow = '';
    currentAppointmentToComplete = null;
    beforeImageInput.value = '';
    afterImageInput.value = '';
    receiptInput.value = '';
    beforeImagePreview.innerHTML = '<p class="text-sm text-gray-500">Clic para subir imagen</p>';
    afterImagePreview.innerHTML = '<p class="text-sm text-gray-500">Clic para subir imagen</p>';
    finalObservationsTextarea.value = '';
    uploadMessage?.classList.add('hidden');
};

const handleImagePreview = (e, previewContainer) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewContainer.innerHTML = `<img src="${event.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
        };
        reader.readAsDataURL(file);
    }
};

const handleCompleteAppointment = async () => {
    if (!currentAppointmentToComplete) return;

    // 1. Validar campos obligatorios
    const price = parseFloat(servicePriceInput.value);
    const paymentMethod = paymentMethodSelect.value;
    
    if (isNaN(price) || price <= 0) {
        alert('Por favor, ingresa un precio de servicio válido (> 0).');
        return;
    }
    if (!paymentMethod) {
        alert('Por favor, selecciona un método de pago.');
        return;
    }
    
    confirmCompletionBtn.disabled = true;
    confirmCompletionBtn.textContent = 'Procesando...';
    
    // 2. Subir archivos
    if (beforeImageInput.files[0]) {
        await uploadAppointmentPhoto(currentAppointmentToComplete, beforeImageInput.files[0], 'before');
    }
    
    if (afterImageInput.files[0]) {
        await uploadAppointmentPhoto(currentAppointmentToComplete, afterImageInput.files[0], 'after');
    }
    
    if (receiptInput.files[0]) {
        await uploadReceiptFile(currentAppointmentToComplete, receiptInput.files[0]);
    }

    // 3. Obtener Pet ID y registrar peso
    const appointment = state.allAppointments.find(app => app.id === currentAppointmentToComplete);
    const petId = appointment?.pet_id;
    const weight = parseFloat(petWeightInput.value);

    if (petId && !isNaN(weight) && weight > 0) {
        // Se registra el peso solo si es válido y hay Pet ID
        await addWeightRecord(petId, weight, currentAppointmentToComplete);
    }
    
    // 4. Actualizar estado y datos finales de la cita
    const updateData = {
        status: 'completada',
        final_observations: finalObservationsTextarea.value || null,
        service_price: price,
        payment_method: paymentMethod,
        final_weight: isNaN(weight) ? null : weight,
    };
    
    const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', currentAppointmentToComplete);
    
    if (error) {
        uploadMessage.textContent = '❌ Error al completar la cita';
        uploadMessage.className = 'block text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
        uploadMessage.classList.remove('hidden');
        confirmCompletionBtn.disabled = false;
        confirmCompletionBtn.textContent = '✓ Completar Cita';
        return;
    }
    
    uploadMessage.textContent = '✅ Cita completada con éxito';
    uploadMessage.className = 'block text-center text-sm font-medium p-3 rounded-lg bg-green-100 text-green-700';
    uploadMessage.classList.remove('hidden');
    
    // 5. Recargar citas
    const { data: appointments } = await supabase
        .from('appointments')
        .select('*, pets(name), profiles(first_name, last_name)')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
    
    if (appointments) {
        updateState('allAppointments', appointments);
        renderConfirmedAppointments();
    }
    
    setTimeout(() => {
        closeCompletionModal();
        confirmCompletionBtn.disabled = false;
        confirmCompletionBtn.textContent = '✓ Completar Cita';
    }, 1500);
};
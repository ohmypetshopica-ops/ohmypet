// public/modules/employee/employee-appointments.js
// Módulo de gestión de citas

import { state, updateState } from './employee-state.js';
import { getClientsWithPets, getBookedTimesForDashboard, addAppointmentFromDashboard, uploadAppointmentPhoto, uploadReceiptFile } from '../dashboard/dashboard.api.js';
import { supabase } from '../../core/supabase.js';
import { addWeightRecord } from '../dashboard/pet-weight.api.js';

// Elementos del DOM
let appointmentsList;
let addAppointmentBtnEmployee, addAppointmentModal, addAppointmentForm, cancelAddAppointmentBtn;
let petSelect, newAppointmentDateInput, newAppointmentTimeSelect, addAppointmentMessage;
let clientSearchInputModal, clientSearchResults, selectedClientIdInput;

// Modal de completar cita
let completionModal, beforeImageInput, beforeImagePreview, afterImageInput, afterImagePreview;
let receiptInput, receiptContainer, finalObservationsTextarea, uploadMessage;
let cancelCompletionBtn, confirmCompletionBtn;
let currentAppointmentToComplete = null;

export const initAppointmentElements = () => {
    appointmentsList = document.getElementById('appointments-list');
    
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
    
    // Modal de completar cita
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
};

export const setupAppointmentListeners = () => {
    addAppointmentBtnEmployee?.addEventListener('click', openAddAppointmentModal);
    cancelAddAppointmentBtn?.addEventListener('click', closeAddAppointmentModal);
    addAppointmentForm?.addEventListener('submit', handleAddAppointment);
    
    clientSearchInputModal?.addEventListener('input', handleClientSearchInModal);
    newAppointmentDateInput?.addEventListener('change', handleDateChange);
    
    appointmentsList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.complete-btn');
        if (btn) {
            const appointmentId = btn.dataset.appointmentId;
            openCompletionModal(appointmentId);
        }
    });
    
    // Listeners para el modal de completar cita
    cancelCompletionBtn?.addEventListener('click', closeCompletionModal);
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
    
    const confirmed = state.allAppointments
        .filter(app => app.status === 'confirmada')
        .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`) - new Date(`${b.appointment_date}T${b.appointment_time}`));

    if (confirmed.length === 0) {
        appointmentsList.innerHTML = `<p class="text-center text-gray-500 mt-8">No hay citas confirmadas pendientes.</p>`;
        return;
    }
    
    appointmentsList.innerHTML = confirmed.map(app => {
        const { serviceDisplay, notesDisplay } = extractNotes(app);

        const notesHTML = notesDisplay 
            ? `<p class="text-xs text-red-500 mt-1"><strong>Instrucciones:</strong> ${notesDisplay}</p>`
            : '';

        return `
            <div class="bg-white p-4 rounded-lg shadow-sm border space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-lg">${app.pets.name}</p>
                        <p class="text-sm text-gray-600">${app.profiles.first_name || ''} ${app.profiles.last_name || ''}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-green-700">${app.appointment_date}</p>
                        <p class="text-gray-500">${app.appointment_time.slice(0, 5)}</p>
                    </div>
                </div>
                <div class="text-sm bg-gray-50 p-2 rounded-md">
                    <p><strong>Servicio:</strong> ${serviceDisplay}</p>
                    ${notesHTML}
                </div>
                <button data-appointment-id="${app.id}" class="complete-btn w-full bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition-colors">
                    Completar Cita
                </button>
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
    
    confirmCompletionBtn.disabled = true;
    confirmCompletionBtn.textContent = 'Procesando...';
    
    // Subir imágenes si existen
    if (beforeImageInput.files[0]) {
        await uploadAppointmentPhoto(currentAppointmentToComplete, beforeImageInput.files[0], 'before');
    }
    
    if (afterImageInput.files[0]) {
        await uploadAppointmentPhoto(currentAppointmentToComplete, afterImageInput.files[0], 'after');
    }
    
    // Subir boleta si existe
    if (receiptInput.files[0]) {
        await uploadReceiptFile(currentAppointmentToComplete, receiptInput.files[0]);
    }
    
    // Actualizar estado de la cita
    const { error } = await supabase
        .from('appointments')
        .update({
            status: 'completada',
            final_observations: finalObservationsTextarea.value || null
        })
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
        closeCompletionModal();
        confirmCompletionBtn.disabled = false;
        confirmCompletionBtn.textContent = '✓ Completar Cita';
    }, 1500);
};
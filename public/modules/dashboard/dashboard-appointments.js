// public/modules/dashboard/dashboard-appointments.js
// VERSIÓN CON MODAL DE FINALIZACIÓN Y REGISTRO DE PESO

import { supabase } from '../../core/supabase.js';
import { getAppointments, updateAppointmentStatus, getAppointmentPhotos, uploadAppointmentPhoto } from './dashboard.api.js';
import { createAppointmentRow } from './dashboard.utils.js';
import { addWeightRecord } from './pet-weight.api.js';

// --- ELEMENTOS DEL DOM ---
const appointmentsTableBody = document.querySelector('#appointments-table-body');
const searchInput = document.querySelector('#appointment-search-input');
const statusFilter = document.querySelector('#appointment-status-filter');
const dateFilter = document.querySelector('#appointment-date-filter');
const clearFiltersButton = document.querySelector('#clear-filters-button');
const headerTitle = document.querySelector('#header-title');

// Modal de Fotos
const photosModal = document.querySelector('#photos-modal');
const closePhotosModalBtn = document.querySelector('#close-photos-modal-btn');
const donePhotosModalBtn = document.querySelector('#done-photos-modal-btn');
const photosModalSubtitle = document.querySelector('#photos-modal-subtitle');
const arrivalPhotoContainer = document.querySelector('#arrival-photo-container');
const departurePhotoContainer = document.querySelector('#departure-photo-container');
const arrivalPhotoInput = document.querySelector('#arrival-photo-input');
const departurePhotoInput = document.querySelector('#departure-photo-input');
const uploadMessage = document.querySelector('#upload-message');

// Modal de Finalización
const completionModal = document.querySelector('#completion-modal');
const finalObservationsTextarea = document.querySelector('#final-observations-textarea');
const cancelCompletionBtn = document.querySelector('#cancel-completion-btn');
const confirmCompletionBtn = document.querySelector('#confirm-completion-btn');

// Modal de Peso
const weightModal = document.querySelector('#weight-modal');
const petNameSpan = document.querySelector('#weight-pet-name');
const weightInput = document.querySelector('#weight-input');
const weightNotesInput = document.querySelector('#weight-notes-input');
const skipWeightBtn = document.querySelector('#skip-weight-btn');
const saveWeightBtn = document.querySelector('#save-weight-btn');

// --- ESTADO ---
let allAppointments = [];
let currentAppointmentId = null;
let currentPetId = null;
let currentCompletedAppointmentId = null;

// --- RENDERIZADO Y FILTRADO ---
const renderAppointmentsTable = (appointments) => {
    if (!appointmentsTableBody) return;
    appointmentsTableBody.innerHTML = appointments.length > 0 
        ? appointments.map(createAppointmentRow).join('') 
        : `<tr><td colspan="7" class="text-center py-8 text-gray-500">No hay citas que coincidan con los filtros.</td></tr>`;
};

const applyFilters = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedDate = dateFilter.value;

    const filtered = allAppointments.filter(apt => {
        const matchesSearch = 
            (apt.profiles?.full_name || apt.profiles?.first_name || apt.profiles?.last_name || '').toLowerCase().includes(searchTerm) ||
            (apt.pets?.name || '').toLowerCase().includes(searchTerm);
        
        const matchesStatus = !selectedStatus || apt.status === selectedStatus;
        const matchesDate = !selectedDate || apt.appointment_date === selectedDate;

        return matchesSearch && matchesStatus && matchesDate;
    });

    renderAppointmentsTable(filtered);
};

// --- CARGA DE CITAS ---
const loadAppointments = async () => {
    allAppointments = await getAppointments();
    applyFilters();
};

// --- MANEJO DE ACCIONES ---
const handleConfirm = async (appointmentId) => {
    if (!confirm('¿Confirmar esta cita?')) return;
    const result = await updateAppointmentStatus(appointmentId, 'confirmada');
    if (result.success) {
        alert('Cita confirmada exitosamente.');
        await loadAppointments();
    } else {
        alert('Error al confirmar la cita.');
    }
};

const handleReject = async (appointmentId) => {
    if (!confirm('¿Rechazar esta cita?')) return;
    const result = await updateAppointmentStatus(appointmentId, 'rechazada');
    if (result.success) {
        alert('Cita rechazada.');
        await loadAppointments();
    } else {
        alert('Error al rechazar la cita.');
    }
};

const handleComplete = async (appointmentId) => {
    currentAppointmentId = appointmentId;
    finalObservationsTextarea.value = '';
    completionModal.classList.remove('hidden');
};

const handleCancel = async (appointmentId) => {
    if (!confirm('¿Cancelar esta cita?')) return;
    const result = await updateAppointmentStatus(appointmentId, 'cancelada');
    if (result.success) {
        alert('Cita cancelada.');
        await loadAppointments();
    } else {
        alert('Error al cancelar la cita.');
    }
};

const handleViewPhotos = async (appointmentId) => {
    currentAppointmentId = appointmentId;
    const appointment = allAppointments.find(apt => apt.id === appointmentId);
    
    if (appointment) {
        const petName = appointment.pets?.name || 'la mascota';
        photosModalSubtitle.textContent = `Fotos de ${petName}`;
    }

    const photos = await getAppointmentPhotos(appointmentId);
    
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
    const departurePhoto = photos.find(p => p.photo_type === 'departure');

    if (arrivalPhoto) {
        arrivalPhotoContainer.innerHTML = `<img src="${arrivalPhoto.image_url}" alt="Llegada" class="max-w-full h-auto rounded-lg shadow-md">`;
    } else {
        arrivalPhotoContainer.innerHTML = `
            <p class="text-gray-500 mb-3">No hay foto de llegada</p>
            <button type="button" onclick="document.getElementById('arrival-photo-input').click()" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg">
                Subir Foto de Llegada
            </button>
        `;
    }

    if (departurePhoto) {
        departurePhotoContainer.innerHTML = `<img src="${departurePhoto.image_url}" alt="Salida" class="max-w-full h-auto rounded-lg shadow-md">`;
    } else {
        departurePhotoContainer.innerHTML = `
            <p class="text-gray-500 mb-3">No hay foto de salida</p>
            <button type="button" onclick="document.getElementById('departure-photo-input').click()" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg">
                Subir Foto de Salida
            </button>
        `;
    }

    photosModal.classList.remove('hidden');
};

// --- SUBIDA DE FOTOS ---
const handlePhotoUpload = async (photoType) => {
    const input = photoType === 'arrival' ? arrivalPhotoInput : departurePhotoInput;
    const file = input.files[0];

    if (!file) return;

    uploadMessage.textContent = 'Subiendo imagen...';
    uploadMessage.className = 'block p-4 rounded-lg bg-blue-100 text-blue-700';
    uploadMessage.classList.remove('hidden');

    const result = await uploadAppointmentPhoto(currentAppointmentId, file, photoType);

    if (result.success) {
        uploadMessage.textContent = '¡Imagen subida exitosamente!';
        uploadMessage.className = 'block p-4 rounded-lg bg-green-100 text-green-700';
        
        setTimeout(() => {
            uploadMessage.classList.add('hidden');
        }, 2000);

        await handleViewPhotos(currentAppointmentId);
    } else {
        uploadMessage.textContent = 'Error al subir la imagen. Inténtalo de nuevo.';
        uploadMessage.className = 'block p-4 rounded-lg bg-red-100 text-red-700';
    }

    input.value = '';
};

arrivalPhotoInput.addEventListener('change', () => handlePhotoUpload('arrival'));
departurePhotoInput.addEventListener('change', () => handlePhotoUpload('departure'));

// --- MODAL DE FINALIZACIÓN ---
cancelCompletionBtn.addEventListener('click', () => {
    completionModal.classList.add('hidden');
    currentAppointmentId = null;
});

confirmCompletionBtn.addEventListener('click', async () => {
    const observations = finalObservationsTextarea.value.trim();
    
    const result = await updateAppointmentStatus(
        currentAppointmentId,
        'completada',
        observations || null
    );

    if (result.success) {
        completionModal.classList.add('hidden');
        
        // Buscar datos de la cita para el modal de peso
        const appointment = allAppointments.find(apt => apt.id === currentAppointmentId);
        
        if (appointment) {
            openWeightModal(appointment);
        }
        
        await loadAppointments();
    } else {
        alert('Error al finalizar la cita. Inténtalo nuevamente.');
    }
});

// --- MODAL DE PESO ---
const openWeightModal = (appointment) => {
    currentPetId = appointment.pet_id;
    currentCompletedAppointmentId = appointment.id;
    petNameSpan.textContent = appointment.pets?.name || 'Mascota';
    weightInput.value = '';
    weightNotesInput.value = '';
    weightModal.classList.remove('hidden');
};

skipWeightBtn.addEventListener('click', () => {
    weightModal.classList.add('hidden');
    currentPetId = null;
    currentCompletedAppointmentId = null;
});

saveWeightBtn.addEventListener('click', async () => {
    const weight = weightInput.value.trim();
    
    if (!weight || parseFloat(weight) <= 0) {
        alert('Por favor, ingresa un peso válido.');
        return;
    }

    const notes = weightNotesInput.value.trim();
    
    const result = await addWeightRecord(
        currentPetId,
        weight,
        currentCompletedAppointmentId,
        notes || null
    );

    if (result.success) {
        alert('Peso registrado exitosamente.');
        weightModal.classList.add('hidden');
        currentPetId = null;
        currentCompletedAppointmentId = null;
    } else {
        alert('Error al registrar el peso. Inténtalo nuevamente.');
    }
});

// --- MODAL DE FOTOS ---
closePhotosModalBtn.addEventListener('click', () => {
    photosModal.classList.add('hidden');
    currentAppointmentId = null;
});

donePhotosModalBtn.addEventListener('click', () => {
    photosModal.classList.add('hidden');
    currentAppointmentId = null;
});

// --- FILTROS ---
searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
dateFilter.addEventListener('change', applyFilters);

clearFiltersButton.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = '';
    dateFilter.value = '';
    applyFilters();
});

// --- DELEGACIÓN DE EVENTOS ---
appointmentsTableBody.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const appointmentId = button.dataset.id;
    const action = button.dataset.action;

    switch (action) {
        case 'confirm':
            handleConfirm(appointmentId);
            break;
        case 'reject':
            handleReject(appointmentId);
            break;
        case 'complete':
            handleComplete(appointmentId);
            break;
        case 'cancel':
            handleCancel(appointmentId);
            break;
        case 'view-photos':
            handleViewPhotos(appointmentId);
            break;
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    if (headerTitle) headerTitle.textContent = 'Gestión de Citas';
    await loadAppointments();
});
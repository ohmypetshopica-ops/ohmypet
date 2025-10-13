// public/modules/dashboard/dashboard-appointments.js
// VERSIÓN CON MODAL DE FINALIZACIÓN

import { supabase } from '../../core/supabase.js';
import { getAppointments, updateAppointmentStatus, getAppointmentPhotos, uploadAppointmentPhoto } from './dashboard.api.js';
import { createAppointmentRow } from './dashboard.utils.js';

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

// **NUEVO**: Modal de Finalización
const completionModal = document.querySelector('#completion-modal');
const finalObservationsTextarea = document.querySelector('#final-observations-textarea');
const cancelCompletionBtn = document.querySelector('#cancel-completion-btn');
const confirmCompletionBtn = document.querySelector('#confirm-completion-btn');

// --- ESTADO ---
let allAppointments = [];
let currentAppointmentId = null;

// --- RENDERIZADO Y FILTRADO (Sin cambios) ---
const renderAppointmentsTable = (appointments) => {
    if (!appointmentsTableBody) return;
    appointmentsTableBody.innerHTML = appointments.length > 0 ? appointments.map(createAppointmentRow).join('') : `<tr><td colspan="5" class="block md:table-cell text-center py-8 text-gray-500">No se encontraron citas.</td></tr>`;
};
const applyFiltersAndSearch = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;
    const selectedDate = dateFilter.value;
    let filteredAppointments = allAppointments;
    if (selectedStatus) filteredAppointments = filteredAppointments.filter(app => app.status === selectedStatus);
    if (selectedDate) filteredAppointments = filteredAppointments.filter(app => app.appointment_date === selectedDate);
    if (searchTerm) filteredAppointments = filteredAppointments.filter(app => {
        const ownerName = (app.profiles?.full_name || `${app.profiles?.first_name} ${app.profiles?.last_name}`).toLowerCase();
        const petName = app.pets?.name.toLowerCase();
        return ownerName.includes(searchTerm) || petName.includes(searchTerm);
    });
    renderAppointmentsTable(filteredAppointments);
};

// --- MODAL DE FOTOS (Sin cambios) ---
const openPhotosModal = async (appointmentId) => {
    currentAppointmentId = appointmentId;
    const appointment = allAppointments.find(app => app.id == appointmentId);
    if (!appointment) return;
    const ownerName = (appointment.profiles?.first_name && appointment.profiles?.last_name) ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}` : appointment.profiles?.full_name;
    photosModalSubtitle.textContent = `Mascota: ${appointment.pets.name} | Dueño: ${ownerName}`;
    arrivalPhotoContainer.innerHTML = `<p class="text-sm text-gray-500">Cargando...</p>`;
    departurePhotoContainer.innerHTML = `<p class="text-sm text-gray-500">Cargando...</p>`;
    uploadMessage.classList.add('hidden');
    photosModal.classList.remove('hidden');
    const photos = await getAppointmentPhotos(appointmentId);
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
    const departurePhoto = photos.find(p => p.photo_type === 'departure');
    arrivalPhotoContainer.innerHTML = arrivalPhoto ? `<img src="${arrivalPhoto.image_url}" class="w-full h-full object-cover rounded-lg">` : `<p class="text-sm text-gray-500">Aún no hay foto de llegada</p>`;
    departurePhotoContainer.innerHTML = departurePhoto ? `<img src="${departurePhoto.image_url}" class="w-full h-full object-cover rounded-lg">` : `<p class="text-sm text-gray-500">Aún no hay foto de salida</p>`;
};
const closePhotosModal = () => {
    photosModal.classList.add('hidden');
    currentAppointmentId = null;
    arrivalPhotoInput.value = '';
    departurePhotoInput.value = '';
};
const handlePhotoUpload = async (file, type, container) => {
    if (!file || !currentAppointmentId) return;
    container.innerHTML = `<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>`;
    uploadMessage.classList.add('hidden');
    const { success, error } = await uploadAppointmentPhoto(currentAppointmentId, file, type);
    if (success) {
        uploadMessage.textContent = `¡Foto de ${type === 'arrival' ? 'llegada' : 'salida'} subida con éxito!`;
        uploadMessage.className = 'block mt-4 text-center text-sm font-medium p-3 rounded-lg bg-green-100 text-green-700';
        openPhotosModal(currentAppointmentId);
    } else {
        uploadMessage.textContent = `Error al subir la foto: ${error.message}`;
        uploadMessage.className = 'block mt-4 text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
        container.innerHTML = `<p class="text-sm text-gray-500">Error al cargar</p>`;
    }
    uploadMessage.classList.remove('hidden');
};

// **NUEVO**: FUNCIONES PARA EL MODAL DE FINALIZACIÓN
const openCompletionModal = (appointmentId) => {
    currentAppointmentId = appointmentId;
    finalObservationsTextarea.value = ''; // Limpiar el textarea
    completionModal.classList.remove('hidden');
};

const closeCompletionModal = () => {
    completionModal.classList.add('hidden');
    currentAppointmentId = null;
};

// --- MANEJO DE ACCIONES ---
const setupActionHandlers = () => {
    if (!appointmentsTableBody) return;
    appointmentsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const appointmentId = button.closest('tr').dataset.appointmentId;
        
        if (action === 'fotos') {
            openPhotosModal(appointmentId);
            return;
        }

        // **MODIFICADO**: Abrir modal en lugar de completar directamente
        if (action === 'completar') {
            openCompletionModal(appointmentId);
            return;
        }

        const newStatusMap = { 'confirmar': 'confirmada', 'rechazar': 'rechazada' };
        const newStatus = newStatusMap[action];
        if (!newStatus) return;

        button.disabled = true;
        button.textContent = '...';
        const { success, error } = await updateAppointmentStatus(appointmentId, newStatus);
        if (success) {
            const index = allAppointments.findIndex(app => app.id == appointmentId);
            if (index !== -1) {
                allAppointments[index].status = newStatus;
                applyFiltersAndSearch();
            }
        } else {
            alert(`Error al actualizar la cita: ${error.message}`);
            button.disabled = false;
            button.textContent = action.charAt(0).toUpperCase() + action.slice(1);
        }
    });
};

// --- INICIALIZACIÓN ---
const initializeAppointmentsSection = async () => {
    if (headerTitle) headerTitle.textContent = 'Gestión de Citas';
    allAppointments = await getAppointments();
    renderAppointmentsTable(allAppointments);
    searchInput.addEventListener('input', applyFiltersAndSearch);
    statusFilter.addEventListener('change', applyFiltersAndSearch);
    dateFilter.addEventListener('change', applyFiltersAndSearch);
    clearFiltersButton.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = '';
        dateFilter.value = '';
        applyFiltersAndSearch();
    });

    setupActionHandlers();

    // Listeners para el modal de fotos
    closePhotosModalBtn.addEventListener('click', closePhotosModal);
    donePhotosModalBtn.addEventListener('click', closePhotosModal);
    photosModal.addEventListener('click', (e) => { if (e.target === photosModal) closePhotosModal(); });
    arrivalPhotoInput.addEventListener('change', (e) => handlePhotoUpload(e.target.files[0], 'arrival', arrivalPhotoContainer));
    departurePhotoInput.addEventListener('change', (e) => handlePhotoUpload(e.target.files[0], 'departure', departurePhotoContainer));

    // **NUEVO**: Listeners para el modal de finalización
    cancelCompletionBtn.addEventListener('click', closeCompletionModal);
    confirmCompletionBtn.addEventListener('click', async () => {
        if (!currentAppointmentId) return;

        confirmCompletionBtn.disabled = true;
        confirmCompletionBtn.textContent = 'Guardando...';

        const observations = finalObservationsTextarea.value;
        const { success, error } = await updateAppointmentStatus(currentAppointmentId, 'completada', observations);

        if (success) {
            const index = allAppointments.findIndex(app => app.id == currentAppointmentId);
            if (index !== -1) {
                allAppointments[index].status = 'completada';
                allAppointments[index].final_observations = observations;
                applyFiltersAndSearch();
            }
            closeCompletionModal();
        } else {
            alert(`Error al completar la cita: ${error.message}`);
        }

        confirmCompletionBtn.disabled = false;
        confirmCompletionBtn.textContent = 'Confirmar y Completar';
    });
};

document.addEventListener('DOMContentLoaded', initializeAppointmentsSection);
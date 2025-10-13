// public/modules/dashboard/dashboard-appointments.js
// VERSIÓN FINAL CON CORRECCIÓN DE TIMING

import { supabase } from '../../core/supabase.js';
import { getAppointments, updateAppointmentStatus, getAppointmentPhotos, uploadAppointmentPhoto } from './dashboard.api.js';
import { createAppointmentRow } from './dashboard.utils.js';

// --- ESTADO GLOBAL ---
let allAppointments = [];
let currentAppointmentId = null;
let arrivalPhotoFile = null;
let departurePhotoFile = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // =========== INICIO DE LA CORRECCIÓN DE TIMING ===================
    // Movemos la selección de elementos aquí, para asegurar que el DOM esté cargado.
    // =================================================================
    const appointmentsTableBody = document.querySelector('#appointments-table-body');
    const searchInput = document.querySelector('#appointment-search-input');
    const statusFilter = document.querySelector('#appointment-status-filter');
    const dateFilter = document.querySelector('#appointment-date-filter');
    const clearFiltersButton = document.querySelector('#clear-filters-button');
    const headerTitle = document.querySelector('#header-title');

    const completionModal = document.querySelector('#completion-modal');
    const completionModalSubtitle = document.querySelector('#completion-modal-subtitle');
    const finalObservationsTextarea = document.querySelector('#final-observations-textarea');
    const cancelCompletionBtn = document.querySelector('#cancel-completion-btn');
    const confirmCompletionBtn = document.querySelector('#confirm-completion-btn');
    const arrivalPhotoContainer = document.querySelector('#arrival-photo-container');
    const departurePhotoContainer = document.querySelector('#departure-photo-container');
    const arrivalPhotoInput = document.querySelector('#arrival-photo-input');
    const departurePhotoInput = document.querySelector('#departure-photo-input');
    const uploadMessage = document.querySelector('#upload-message');
    // =================================================================
    // ================ FIN DE LA CORRECCIÓN DE TIMING =================
    // =================================================================

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

    const openCompletionModal = async (appointmentId) => {
        currentAppointmentId = appointmentId;
        const appointment = allAppointments.find(app => app.id == appointmentId);
        if (!appointment) return;

        finalObservationsTextarea.value = appointment.final_observations || '';
        arrivalPhotoFile = null;
        departurePhotoFile = null;
        arrivalPhotoInput.value = '';
        departurePhotoInput.value = '';
        uploadMessage.classList.add('hidden');
        
        const ownerName = (appointment.profiles?.first_name && appointment.profiles?.last_name) ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}` : appointment.profiles?.full_name;
        completionModalSubtitle.textContent = `Mascota: ${appointment.pets.name} | Dueño: ${ownerName}`;

        completionModal.classList.remove('hidden');

        arrivalPhotoContainer.innerHTML = `<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>`;
        departurePhotoContainer.innerHTML = `<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>`;
        
        const photos = await getAppointmentPhotos(appointmentId);
        const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
        const departurePhoto = photos.find(p => p.photo_type === 'departure');

        arrivalPhotoContainer.innerHTML = arrivalPhoto ? `<img src="${arrivalPhoto.image_url}" class="w-full h-full object-cover rounded-lg">` : `<p class="text-sm text-gray-500 text-center p-4">Clic para subir foto de llegada</p>`;
        departurePhotoContainer.innerHTML = departurePhoto ? `<img src="${departurePhoto.image_url}" class="w-full h-full object-cover rounded-lg">` : `<p class="text-sm text-gray-500 text-center p-4">Clic para subir foto de salida</p>`;
    };

    const closeCompletionModal = () => {
        completionModal.classList.add('hidden');
        currentAppointmentId = null;
    };

    const setupActionHandlers = () => {
        if (!appointmentsTableBody) return;
        appointmentsTableBody.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const action = button.dataset.action;
            const appointmentId = button.closest('tr').dataset.appointmentId;
            
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

    const initializePage = async () => {
        if (headerTitle) headerTitle.textContent = 'Gestión de Citas';
        allAppointments = await getAppointments();
        renderAppointmentsTable(allAppointments);
        
        searchInput.addEventListener('input', applyFiltersAndSearch);
        statusFilter.addEventListener('change', applyFiltersAndSearch);
        dateFilter.addEventListener('change', applyFiltersAndSearch);
        clearFiltersButton.addEventListener('click', () => {
            searchInput.value = ''; statusFilter.value = ''; dateFilter.value = '';
            applyFiltersAndSearch();
        });

        setupActionHandlers();

        cancelCompletionBtn.addEventListener('click', closeCompletionModal);
        
        arrivalPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                arrivalPhotoFile = file;
                const reader = new FileReader();
                reader.onload = (event) => { arrivalPhotoContainer.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover rounded-lg">`; };
                reader.readAsDataURL(file);
            }
        });

        departurePhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                departurePhotoFile = file;
                const reader = new FileReader();
                reader.onload = (event) => { departurePhotoContainer.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover rounded-lg">`; };
                reader.readAsDataURL(file);
            }
        });

        confirmCompletionBtn.addEventListener('click', async () => {
            if (!currentAppointmentId) return;
            confirmCompletionBtn.disabled = true;
            confirmCompletionBtn.textContent = 'Guardando...';
            uploadMessage.classList.remove('hidden');
            uploadMessage.className = 'mx-6 text-center text-sm font-medium p-3 rounded-lg bg-blue-100 text-blue-700';
            uploadMessage.textContent = 'Procesando... No cierres esta ventana.';
            try {
                if (arrivalPhotoFile) {
                    uploadMessage.textContent = 'Subiendo foto de llegada...';
                    await uploadAppointmentPhoto(currentAppointmentId, arrivalPhotoFile, 'arrival');
                }
                if (departurePhotoFile) {
                    uploadMessage.textContent = 'Subiendo foto de salida...';
                    await uploadAppointmentPhoto(currentAppointmentId, departurePhotoFile, 'departure');
                }
                uploadMessage.textContent = 'Guardando observaciones...';
                const observations = finalObservationsTextarea.value;
                const { success } = await updateAppointmentStatus(currentAppointmentId, 'completada', observations);
                if (success) {
                    const index = allAppointments.findIndex(app => app.id == currentAppointmentId);
                    if (index !== -1) {
                        allAppointments[index].status = 'completada';
                        allAppointments[index].final_observations = observations;
                        applyFiltersAndSearch();
                    }
                    closeCompletionModal();
                } else { throw new Error('No se pudo actualizar el estado de la cita.'); }
            } catch (error) {
                uploadMessage.className = 'mx-6 text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
                uploadMessage.textContent = `Error: ${error.message}`;
            } finally {
                confirmCompletionBtn.disabled = false;
                confirmCompletionBtn.textContent = 'Confirmar y Completar';
            }
        });
    };

    initializePage();
});
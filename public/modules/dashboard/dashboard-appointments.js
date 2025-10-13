import { supabase } from '../../core/supabase.js';
import { getAppointments, updateAppointmentStatus, getAppointmentPhotos, uploadAppointmentPhoto, uploadReceiptFile } from './dashboard.api.js';
import { addWeightRecord } from './pet-weight.api.js';
import { createAppointmentRow } from './dashboard.utils.js';

let allAppointments = [];
let currentAppointmentId = null;
let currentPetId = null;
let arrivalPhotoFile = null;
let departurePhotoFile = null;
let receiptFile = null;

document.addEventListener('DOMContentLoaded', () => {
    const appointmentsTableBody = document.querySelector('#appointments-table-body');
    const searchInput = document.querySelector('#appointment-search-input');
    const statusFilter = document.querySelector('#appointment-status-filter');
    const dateFilter = document.querySelector('#appointment-date-filter');
    const clearFiltersButton = document.querySelector('#clear-filters-button');
    
    const completionModal = document.querySelector('#completion-modal');
    const completionModalSubtitle = document.querySelector('#completion-modal-subtitle');
    const finalObservationsTextarea = document.querySelector('#final-observations-textarea');
    const petWeightInput = document.querySelector('#pet-weight-input');
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

    const renderAppointmentsTable = (appointments) => {
        if (!appointmentsTableBody) return;
        appointmentsTableBody.innerHTML = appointments.length > 0 
            ? appointments.map(createAppointmentRow).join('') 
            : `<tr><td colspan="5" class="block md:table-cell text-center py-8 text-gray-500">No se encontraron citas.</td></tr>`;
    };

    const applyFiltersAndSearch = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedStatus = statusFilter.value;
        const selectedDate = dateFilter.value;
        let filteredAppointments = allAppointments;

        if (selectedStatus) {
            filteredAppointments = filteredAppointments.filter(app => app.status === selectedStatus);
        }
        if (selectedDate) {
            filteredAppointments = filteredAppointments.filter(app => app.appointment_date === selectedDate);
        }
        if (searchTerm) {
            filteredAppointments = filteredAppointments.filter(app => {
                const ownerName = (app.profiles?.full_name || `${app.profiles?.first_name} ${app.profiles?.last_name}`).toLowerCase();
                const petName = app.pets?.name.toLowerCase();
                return ownerName.includes(searchTerm) || petName.includes(searchTerm);
            });
        }
        renderAppointmentsTable(filteredAppointments);
    };

    const openCompletionModal = async (appointmentId) => {
        currentAppointmentId = appointmentId;
        const appointment = allAppointments.find(app => app.id == appointmentId);
        if (!appointment) return;

        currentPetId = appointment.pet_id;

        finalObservationsTextarea.value = appointment.final_observations || '';
        petWeightInput.value = appointment.pet_weight || '';
        arrivalPhotoFile = null;
        departurePhotoFile = null;
        receiptFile = null;
        arrivalPhotoInput.value = '';
        departurePhotoInput.value = '';
        receiptInput.value = '';
        uploadMessage.classList.add('hidden');
        
        const ownerName = (appointment.profiles?.first_name && appointment.profiles?.last_name) 
            ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}` 
            : appointment.profiles?.full_name;
        completionModalSubtitle.textContent = `Mascota: ${appointment.pets.name} | Dueño: ${ownerName}`;

        completionModal.classList.remove('hidden');

        arrivalPhotoContainer.innerHTML = `<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>`;
        departurePhotoContainer.innerHTML = `<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>`;
        
        const photos = await getAppointmentPhotos(appointmentId);
        const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
        const departurePhoto = photos.find(p => p.photo_type === 'departure');

        arrivalPhotoContainer.innerHTML = arrivalPhoto 
            ? `<img src="${arrivalPhoto.image_url}" alt="Foto de llegada" class="w-full h-full object-cover rounded-lg">` 
            : `<p class="text-sm text-gray-500">Clic para subir foto de llegada</p>`;
        
        departurePhotoContainer.innerHTML = departurePhoto 
            ? `<img src="${departurePhoto.image_url}" alt="Foto de salida" class="w-full h-full object-cover rounded-lg">` 
            : `<p class="text-sm text-gray-500">Clic para subir foto de salida</p>`;

        if (appointment.receipt_url) {
            receiptContainer.innerHTML = `<p class="text-sm text-green-600">✓ Boleta cargada</p>`;
        } else {
            receiptContainer.innerHTML = `<p class="text-sm text-gray-500">Clic para subir boleta</p>`;
        }
    };

    const closeCompletionModal = () => {
        completionModal.classList.add('hidden');
        currentAppointmentId = null;
        currentPetId = null;
        arrivalPhotoFile = null;
        departurePhotoFile = null;
        receiptFile = null;
    };

    const initializePage = async () => {
        allAppointments = await getAppointments();
        renderAppointmentsTable(allAppointments);

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
            const appointmentId = row?.dataset.appointmentId;

            if (action === 'confirmar') {
                const { success } = await updateAppointmentStatus(appointmentId, 'confirmada');
                if (success) {
                    const index = allAppointments.findIndex(app => app.id == appointmentId);
                    if (index !== -1) {
                        allAppointments[index].status = 'confirmada';
                        applyFiltersAndSearch();
                    }
                }
            } else if (action === 'rechazar') {
                const { success } = await updateAppointmentStatus(appointmentId, 'rechazada');
                if (success) {
                    const index = allAppointments.findIndex(app => app.id == appointmentId);
                    if (index !== -1) {
                        allAppointments[index].status = 'rechazada';
                        applyFiltersAndSearch();
                    }
                }
            } else if (action === 'completar') {
                openCompletionModal(appointmentId);
            }
        });

        arrivalPhotoInput?.addEventListener('change', (e) => {
            arrivalPhotoFile = e.target.files[0];
            if (arrivalPhotoFile) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    arrivalPhotoContainer.innerHTML = `<img src="${event.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
                };
                reader.readAsDataURL(arrivalPhotoFile);
            }
        });

        departurePhotoInput?.addEventListener('change', (e) => {
            departurePhotoFile = e.target.files[0];
            if (departurePhotoFile) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    departurePhotoContainer.innerHTML = `<img src="${event.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
                };
                reader.readAsDataURL(departurePhotoFile);
            }
        });

        receiptInput?.addEventListener('change', (e) => {
            receiptFile = e.target.files[0];
            if (receiptFile) {
                receiptContainer.innerHTML = `<p class="text-sm text-green-600">✓ ${receiptFile.name}</p>`;
            }
        });

        cancelCompletionBtn?.addEventListener('click', closeCompletionModal);

        saveDuringAppointmentBtn?.addEventListener('click', async () => {
            uploadMessage.classList.remove('hidden');
            uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-blue-100 text-blue-700';
            uploadMessage.textContent = 'Guardando información...';
            saveDuringAppointmentBtn.disabled = true;

            try {
                if (arrivalPhotoFile) {
                    await uploadAppointmentPhoto(currentAppointmentId, arrivalPhotoFile, 'arrival');
                }
                if (departurePhotoFile) {
                    await uploadAppointmentPhoto(currentAppointmentId, departurePhotoFile, 'departure');
                }
                if (receiptFile) {
                    await uploadReceiptFile(currentAppointmentId, receiptFile);
                }

                const observations = finalObservationsTextarea.value.trim();
                const weight = petWeightInput.value.trim();

                const updateData = {};
                if (observations) updateData.final_observations = observations;
                if (weight) updateData.pet_weight = parseFloat(weight);

                if (Object.keys(updateData).length > 0) {
                    await supabase
                        .from('appointments')
                        .update(updateData)
                        .eq('id', currentAppointmentId);
                }

                uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-green-100 text-green-700';
                uploadMessage.textContent = '✓ Información guardada correctamente';
                
                setTimeout(() => {
                    uploadMessage.classList.add('hidden');
                }, 3000);
            } catch (error) {
                uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
                uploadMessage.textContent = `Error: ${error.message}`;
            } finally {
                saveDuringAppointmentBtn.disabled = false;
            }
        });

        confirmCompletionBtn?.addEventListener('click', async () => {
            const weight = petWeightInput.value.trim();
            
            if (!arrivalPhotoFile && !departurePhotoFile) {
                const photos = await getAppointmentPhotos(currentAppointmentId);
                if (photos.length === 0) {
                    alert('❌ Debes subir al menos las fotos de llegada y salida antes de completar la cita.');
                    return;
                }
            }

            if (!weight) {
                alert('❌ Debes registrar el peso de la mascota antes de completar la cita.');
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
                
                uploadMessage.textContent = 'Registrando peso de la mascota...';
                await addWeightRecord(currentPetId, parseFloat(weight), currentAppointmentId);

                uploadMessage.textContent = 'Guardando observaciones y completando cita...';
                const observations = finalObservationsTextarea.value.trim();
                const { success } = await updateAppointmentStatus(currentAppointmentId, 'completada', observations);
                
                if (success) {
                    const index = allAppointments.findIndex(app => app.id == currentAppointmentId);
                    if (index !== -1) {
                        allAppointments[index].status = 'completada';
                        allAppointments[index].final_observations = observations;
                        allAppointments[index].pet_weight = parseFloat(weight);
                        applyFiltersAndSearch();
                    }
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
    };

    initializePage();
});
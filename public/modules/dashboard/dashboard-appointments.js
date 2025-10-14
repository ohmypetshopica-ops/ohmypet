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
            : `<tr><td colspan="5" class="text-center py-8 text-gray-500">No se encontraron citas.</td></tr>`;
    };

    const applyFiltersAndSearch = () => {
        let filtered = [...allAppointments];
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedStatus = statusFilter.value;
        const selectedDate = dateFilter.value;

        if (searchTerm) {
            filtered = filtered.filter(app => {
                const petName = app.pets?.name?.toLowerCase() || '';
                const ownerProfile = app.profiles;
                const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name)
                    ? `${ownerProfile.first_name} ${ownerProfile.last_name}`.toLowerCase()
                    : ownerProfile?.full_name?.toLowerCase() || '';
                return petName.includes(searchTerm) || ownerName.includes(searchTerm);
            });
        }

        if (selectedStatus) {
            filtered = filtered.filter(app => app.status === selectedStatus);
        }

        if (selectedDate) {
            filtered = filtered.filter(app => app.appointment_date === selectedDate);
        }

        renderAppointmentsTable(filtered);
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
        uploadMessage.classList.add('hidden');
        
        completionModal.classList.remove('hidden');

        const appointment = allAppointments.find(app => app.id == appointmentId);
        if (appointment) {
            if (appointment.final_observations) {
                finalObservationsTextarea.value = appointment.final_observations;
            }
            if (appointment.final_weight) {
                petWeightInput.value = appointment.final_weight;
            }
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
            const appointmentId = row.dataset.appointmentId;

            if (action === 'confirmar') {
                if (confirm('¿Confirmar esta cita?')) {
                    const { success } = await updateAppointmentStatus(appointmentId, 'confirmada');
                    if (success) {
                        const index = allAppointments.findIndex(app => app.id == appointmentId);
                        if (index !== -1) {
                            allAppointments[index].status = 'confirmada';
                            applyFiltersAndSearch();
                        }
                    } else {
                        alert('Error al confirmar la cita.');
                    }
                }
            } else if (action === 'rechazar') {
                if (confirm('¿Rechazar esta cita?')) {
                    const { success } = await updateAppointmentStatus(appointmentId, 'rechazada');
                    if (success) {
                        const index = allAppointments.findIndex(app => app.id == appointmentId);
                        if (index !== -1) {
                            allAppointments[index].status = 'rechazada';
                            applyFiltersAndSearch();
                        }
                    } else {
                        alert('Error al rechazar la cita.');
                    }
                }
            } else if (action === 'completar') {
                const appointment = allAppointments.find(app => app.id == appointmentId);
                if (appointment) {
                    const petName = appointment.pets?.name || 'N/A';
                    const petId = appointment.pet_id;
                    openCompletionModal(appointmentId, petName, petId);
                }
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

                const updateData = {};
                if (observations) updateData.final_observations = observations;
                if (weight) updateData.final_weight = parseFloat(weight);

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
                
                await loadExistingPhotosAndReceipt(currentAppointmentId);

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
            const photos = await getAppointmentPhotos(currentAppointmentId);
            const hasArrivalPhoto = photos.some(p => p.photo_type === 'arrival') || arrivalPhotoFile;
            const hasDeparturePhoto = photos.some(p => p.photo_type === 'departure') || departurePhotoFile;

            let missingFields = [];
            if (!hasArrivalPhoto) missingFields.push('foto de llegada');
            if (!hasDeparturePhoto) missingFields.push('foto de salida');
            if (!weight) missingFields.push('peso de la mascota');

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
                        allAppointments[index].final_weight = parseFloat(weight);
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
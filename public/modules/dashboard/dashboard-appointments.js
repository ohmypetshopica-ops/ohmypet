import { supabase } from '../../core/supabase.js';
import { 
    getAppointments, 
    updateAppointmentStatus, 
    getAppointmentPhotos, 
    uploadAppointmentPhoto, 
    uploadReceiptFile,
    getClientsWithPets,
    getBookedTimesForDashboard,
    addAppointmentFromDashboard
} from './dashboard.api.js';
import { addWeightRecord } from './pet-weight.api.js';
import { createAppointmentRow } from './dashboard.utils.js';

console.log("🚀 dashboard-appointments.js cargado y ejecutándose...");

let allAppointments = [];
let clientsWithPets = []; // Caché para clientes y sus mascotas
let currentAppointmentId = null;
let currentPetId = null;
let arrivalPhotoFile = null;
let departurePhotoFile = null;
let receiptFile = null;

// --- ELEMENTOS DEL DOM GENERAL ---
const appointmentsTableBody = document.querySelector('#appointments-table-body');
const searchInput = document.querySelector('#appointment-search-input');
const statusFilter = document.querySelector('#appointment-status-filter');
const dateFilter = document.querySelector('#appointment-date-filter');
const clearFiltersButton = document.querySelector('#clear-filters-button');

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

// --- RENDERIZADO Y FILTROS DE TABLA ---

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


// --- LÓGICA DEL MODAL PARA AGENDAR CITA ---

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
    newAppointmentDateInput.min = new Date().toISOString().split("T")[0];

    addAppointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = addAppointmentForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        const formData = new FormData(addAppointmentForm);
        const appointmentData = {
            user_id: formData.get('user_id'),
            pet_id: formData.get('pet_id'),
            appointment_date: formData.get('appointment_date'),
            appointment_time: formData.get('appointment_time'),
            service: formData.get('service') || 'Servicio de Estética',
            status: 'confirmada'
        };

        if (!appointmentData.user_id || !appointmentData.pet_id || !appointmentData.appointment_date || !appointmentData.appointment_time) {
            alert('Por favor, completa todos los campos obligatorios.');
            submitButton.disabled = false;
            return;
        }

        const { success, error } = await addAppointmentFromDashboard(appointmentData);

        if (success) {
            alert('¡Cita agendada con éxito!');
            closeAddAppointmentModal();
            allAppointments = await getAppointments();
            applyFiltersAndSearch();
        } else {
            addAppointmentMessage.textContent = `Error: ${error.message}`;
            addAppointmentMessage.className = 'p-3 rounded-md bg-red-100 text-red-700 text-sm';
            addAppointmentMessage.classList.remove('hidden');
        }

        submitButton.disabled = false;
    });
};


// --- LÓGICA DEL MODAL PARA COMPLETAR CITA ---

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

    completionModal.classList.remove('hidden');

    const appointment = allAppointments.find(app => app.id == appointmentId);
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
};


// --- INICIALIZACIÓN DE LA PÁGINA ---

const initializePage = async () => {
    console.log("🔄 Obteniendo citas...");
    allAppointments = await getAppointments();
    if (allAppointments) {
        console.log(`✅ Se obtuvieron ${allAppointments.length} citas.`);
    }
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

        if (action === 'confirmar' || action === 'rechazar') {
            const newStatus = action === 'confirmar' ? 'confirmada' : 'rechazada';
            const confirmationText = action === 'confirmar' ? '¿Confirmar esta cita?' : '¿Rechazar esta cita?';
            
            if (confirm(confirmationText)) {
                const { success } = await updateAppointmentStatus(appointmentId, newStatus);
                if (success) {
                    const index = allAppointments.findIndex(app => app.id == appointmentId);
                    if (index !== -1) {
                        allAppointments[index].status = newStatus;
                        applyFiltersAndSearch();
                    }
                } else {
                    alert(`Error al ${action} la cita.`);
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
        const price = servicePriceInput.value.trim();
        const paymentMethod = paymentMethodSelect.value;
        const photos = await getAppointmentPhotos(currentAppointmentId);
        const hasArrivalPhoto = photos.some(p => p.photo_type === 'arrival') || arrivalPhotoFile;
        const hasDeparturePhoto = photos.some(p => p.photo_type === 'departure') || departurePhotoFile;

        let missingFields = [];
        if (!hasArrivalPhoto) missingFields.push('foto de llegada');
        if (!hasDeparturePhoto) missingFields.push('foto de salida');
        if (!weight) missingFields.push('peso de la mascota');
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

            uploadMessage.textContent = 'Registrando peso de la mascota...';
            await addWeightRecord(currentPetId, parseFloat(weight), currentAppointmentId);

            uploadMessage.textContent = 'Guardando observaciones y completando cita...';
            const observations = finalObservationsTextarea.value.trim();
            
            const appointment = allAppointments.find(app => app.id === currentAppointmentId);
            const appointmentDate = appointment ? appointment.appointment_date : new Date().toISOString().split('T')[0];

            const { success } = await updateAppointmentStatus(currentAppointmentId, 'completada', {
                observations: observations,
                weight: parseFloat(weight),
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
                
                const index = allAppointments.findIndex(app => app.id == currentAppointmentId);
                if (index !== -1) {
                    allAppointments[index].status = 'completada';
                    allAppointments[index].final_observations = observations;
                    allAppointments[index].final_weight = parseFloat(weight);
                    allAppointments[index].service_price = parseFloat(price);
                    allAppointments[index].payment_method = paymentMethod;
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
    
    // Inicializar el nuevo modal para agendar citas
    initializeAddAppointmentModal();
};

initializePage();
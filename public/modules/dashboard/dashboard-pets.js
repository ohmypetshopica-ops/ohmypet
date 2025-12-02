// public/modules/dashboard/dashboard-pets.js
import { supabase } from '../../core/supabase.js';
// --- INICIO: CÓDIGO ACTUALIZADO ---
// Se eliminó 'getPetLastServiceDate' de esta línea de importación
import { deletePet } from './pets.api.js';
// --- FIN: CÓDIGO ACTUALIZADO ---


const petsTableBody = document.querySelector('#pets-table-body');
const petSearchInput = document.querySelector('#pet-search-input');
const breedFilterBtn = document.querySelector('#breed-filter-btn');
const breedFilterDropdown = document.querySelector('#breed-filter-dropdown');
const breedFilterText = document.querySelector('#breed-filter-text');
const breedOptionsList = document.querySelector('#breed-options-list');
const selectedBreedsTags = document.querySelector('#selected-breeds-tags');
const headerTitle = document.querySelector('#header-title');
const totalPetsCount = document.querySelector('#total-pets-count');
const dogsCount = document.querySelector('#dogs-count');
const appointmentsMonthCount = document.querySelector('#appointments-month-count');
const paginationContainer = document.querySelector('#pagination-container');

const petDetailsModal = document.querySelector('#pet-details-modal');
const closeModalBtn = document.querySelector('#close-modal-btn');
const closeModalBottomBtn = document.querySelector('#close-modal-bottom-btn');
const editPetBtn = document.querySelector('#edit-pet-btn');
const savePetBtn = document.querySelector('#save-pet-btn');
const cancelEditBtn = document.querySelector('#cancel-edit-btn');
const petViewMode = document.querySelector('#pet-view-mode');
const petEditMode = document.querySelector('#pet-edit-mode');
const editPetPhoto = document.querySelector('#edit-pet-photo');
const editPetImagePreview = document.querySelector('#edit-pet-image-preview');

// --- NUEVOS ELEMENTOS DEL MODAL DE EDICIÓN ---
const editReminderFrequencyInput = document.querySelector('#edit-reminder-frequency');
const editReminderStartDateInput = document.querySelector('#edit-reminder-start-date');
const editSetLastServiceDateBtn = document.querySelector('#edit-set-last-service-date-btn');
const reminderFieldsContainer = document.querySelector('#reminder-fields-container');
const toggleReminderInput = document.querySelector('#toggle-reminder-input');
const toggleReminderLabel = document.querySelector('#toggle-reminder-label');
const addAppointmentFromPetBtn = document.querySelector('#add-appointment-from-pet-btn'); 

// --- INICIO: CÓDIGO AÑADIDO ---
const mainAlertMessage = document.querySelector('#main-alert-message');
const modalDeletePetBtn = document.querySelector('#modal-delete-pet-btn');
const deletePetConfirmModal = document.querySelector('#delete-pet-confirm-modal');
const deletePetName = document.querySelector('#delete-pet-name');
const cancelDeletePetBtn = document.querySelector('#cancel-delete-pet-btn');
const confirmDeletePetBtn = document.querySelector('#confirm-delete-pet-btn');
const deletePetErrorMessage = document.querySelector('#delete-pet-error-message');
let isInitialized = false;
// --- FIN: CÓDIGO AÑADIDO ---


let currentPage = 1;
const itemsPerPage = 10;
let totalPets = 0;
let currentSearch = '';
let selectedBreeds = [];
let allBreeds = [];
let currentPetData = null;
let photoFile = null;

// --- INICIO: CÓDIGO AÑADIDO (Función Alerta) ---
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
// --- FIN: CÓDIGO AÑADIDO ---


// --- FUNCIÓN ADICIONAL PARA OBTENER ÚLTIMA CITA COMPLETADA ---
const getPetLastServiceDate = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('pet_id', petId)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
        console.error('Error al obtener la última fecha de servicio:', error);
        return null;
    }
    
    return data ? data.appointment_date : null;
};


// --- FUNCIÓN CORREGIDA PARA CALCULAR ESTADO DE RECORDATORIO ---
const getReminderStatus = (lastDate, frequency) => {
    if (!lastDate || !frequency) {
        return { text: 'Sin configurar', color: 'gray' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastGroomingDate = new Date(lastDate + 'T00:00:00');
    const nextAppointmentDate = new Date(lastGroomingDate);
    nextAppointmentDate.setDate(lastGroomingDate.getDate() + frequency);

    const diffTime = nextAppointmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
        return { text: `Faltan ${diffDays} días`, color: 'blue' };
    } else if (diffDays > 0) {
        return { text: `Faltan ${diffDays} días`, color: 'green' };
    } else if (diffDays === 0) {
        return { text: 'Cita hoy', color: 'green' };
    } else {
        return { text: `Vencido por ${Math.abs(diffDays)} días`, color: 'red' };
    }
};


const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years === 0) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    else if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    else return `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`;
};

// =================================================================
// --- INICIO DE LA CORRECCIÓN ---
// =================================================================
const getPetsPaginated = async (page = 1, search = '', breeds = []) => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
        .from('pets')
        .select(`
            id, name, breed, sex, size, weight, birth_date, image_url, 
            last_grooming_date, reminder_frequency_days, 
            profiles (id, full_name, first_name, last_name)
        `, { count: 'exact' });

    if (search) {
        // 1. Encontrar IDs de dueños que coincidan con la búsqueda
        const { data: matchingOwners, error: ownerError } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
        
        if (ownerError) console.error("Error buscando dueños:", ownerError);

        const ownerIds = matchingOwners ? matchingOwners.map(o => o.id) : [];

        // 2. Construir la consulta OR principal
        // Busca:
        // - nombre de mascota O
        // - raza de mascota O
        // - owner_id está en la lista de IDs de dueños que encontramos
        let orConditions = `name.ilike.%${search}%,breed.ilike.%${search}%`;
        if (ownerIds.length > 0) {
            orConditions += `,owner_id.in.(${ownerIds.join(',')})`;
        }
        
        query = query.or(orConditions);
    }
    
    // =================================================================
    // --- FIN DE LA CORRECCIÓN ---
    // =================================================================

    // Aplicar filtros de raza (si existen)
    if (breeds.length > 0) {
        query = query.in('breed', breeds);
    }

    // Aplicar orden y paginación
    query = query
        .order('created_at', { ascending: false })
        .range(from, to);

    const { data, error, count } = await query;
    
    if (error) { 
        console.error('Error al obtener mascotas:', error); 
        return { pets: [], total: 0 }; 
    }
    
    return { pets: data || [], total: count || 0 };
};
// =================================================================
// --- FIN DE LA SECCIÓN CORREGIDA ---
// =================================================================

const getPetDetails = async (petId) => {
    const { data, error } = await supabase.from('pets').select(`*, profiles (id, full_name, first_name, last_name), appointments (id, appointment_date, appointment_time, service, status)`).eq('id', petId).single();
    if (error) { console.error('Error al obtener detalles de la mascota:', error); return null; }
    
    // CORRECCIÓN CRÍTICA: Se corrige el ordenamiento (antes era b - b, ahora es b - a)
    if (data.appointments) {
        data.appointments.sort((a, b) => 
            new Date(`${b.appointment_date}T${b.appointment_time}`) - new Date(`${a.appointment_date}T${a.appointment_time}`)
        );
    }
    return data;
};

const updatePet = async (petId, updates) => {
    const { data, error } = await supabase.from('pets').update(updates).eq('id', petId).select();
    if (error) { console.error('Error al actualizar mascota:', error); return { success: false, error }; }
    return { success: true, data };
};

const getAllBreeds = async () => {
    const { data, error } = await supabase.from('pets').select('breed').not('breed', 'is', null).order('breed');
    if (error) { console.error('Error al obtener razas:', error); return []; }
    return [...new Set(data.map(p => p.breed))].sort();
};

const getStats = async () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const [totalRes, dogsRes, appointmentsRes] = await Promise.all([
        supabase.from('pets').select('*', { count: 'exact', head: true }),
        supabase.from('pets').select('*', { count: 'exact', head: true }).eq('species', 'Perro'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('appointment_date', firstDayOfMonth).lte('appointment_date', lastDayOfMonth)
    ]);
    return { totalPets: totalRes.count || 0, dogs: dogsRes.count || 0, appointmentsMonth: appointmentsRes.count || 0 };
};

const createPetRow = (pet) => {
    const ownerProfile = pet.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) ? `${ownerProfile.first_name} ${ownerProfile.last_name}` : ownerProfile?.full_name || 'Sin dueño';
    const age = calculateAge(pet.birth_date) || 'N/A';
    const weight = pet.weight ? `${pet.weight} kg` : 'N/A';
    
    const reminder = getReminderStatus(pet.last_grooming_date, pet.reminder_frequency_days);
    const reminderColors = {
        gray: 'bg-gray-100 text-gray-800',
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
    };
    
    return `
        <tr class="hover:bg-gray-50 transition-colors" data-pet-id="${pet.id}">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <img src="${pet.image_url || `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${pet.name.charAt(0)}`}" alt="${pet.name}" class="h-10 w-10 rounded-full object-cover mr-3">
                    <div><div class="text-sm font-medium text-gray-900">${pet.name}</div><div class="text-sm text-gray-500">${pet.breed || 'Sin raza'}</div></div>
                </div>
            </td>
            <td class="px-6 py-4"><div class="text-sm text-gray-900">${ownerName}</div></td>
            <td class="px-6 py-4"><div class="text-sm text-gray-900">${pet.sex || 'N/A'}</div></td>
            <td class="px-6 py-4"><div class="text-sm text-gray-900">${age}</div></td>
            <td class="px-6 py-4"><div class="text-sm text-gray-900">${weight}</div></td>
            <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reminderColors[reminder.color]}">${reminder.text}</span></td>
            <td class="px-6 py-4 text-right text-sm font-medium"><button class="text-blue-600 hover:text-blue-900 font-semibold view-details-btn">Ver Detalles</button></td>
        </tr>
    `;
};

const renderPetsTable = (pets) => {
    if (!petsTableBody) return;
    petsTableBody.innerHTML = pets.length > 0 ? pets.map(pet => createPetRow(pet)).join('') : '<tr><td colspan="7" class="text-center py-8 text-gray-500">No se encontraron mascotas.</td></tr>';
};

const renderPagination = () => {
    const totalPages = Math.ceil(totalPets / itemsPerPage);
    if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }
    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4 mb-4">';
    if (currentPage > 1) paginationHTML += `<button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage - 1}">Anterior</button>`;
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'bg-green-600 text-white' : 'border border-gray-300 hover:bg-gray-100';
        paginationHTML += `<button class="px-3 py-1.5 text-sm rounded-lg transition-colors ${activeClass}" data-page="${i}">${i}</button>`;
    }
    if (currentPage < totalPages) paginationHTML += `<button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage + 1}">Siguiente</button>`;
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
    paginationContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async () => { currentPage = parseInt(btn.dataset.page); await loadAndRenderPets(false); });
    });
};

const loadAndRenderPets = async (resetPage = true) => {
    if (resetPage) currentPage = 1;
    petsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">Cargando mascotas...</td></tr>';
    
    currentSearch = petSearchInput?.value.trim() || '';
    const { pets, total } = await getPetsPaginated(currentPage, currentSearch, selectedBreeds);
    
    totalPets = total;
    renderPetsTable(pets);
    renderPagination();
};

const renderBreedOptions = async () => {
    allBreeds = await getAllBreeds();
    if (!breedOptionsList) return;
    breedOptionsList.innerHTML = `<label class="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer rounded-lg"><input type="checkbox" value="all" class="breed-checkbox mr-2" checked><span class="text-sm text-gray-700">Todas las razas</span></label>` + allBreeds.map(breed => `<label class="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer rounded-lg"><input type="checkbox" value="${breed}" class="breed-checkbox mr-2"><span class="text-sm text-gray-700">${breed}</span></label>`).join('');
    breedOptionsList.querySelectorAll('.breed-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.value === 'all') {
                if (checkbox.checked) { selectedBreeds = []; breedOptionsList.querySelectorAll('.breed-checkbox').forEach(cb => { if (cb.value !== 'all') cb.checked = false; }); }
            } else {
                const allCheckbox = breedOptionsList.querySelector('.breed-checkbox[value="all"]');
                if (allCheckbox) allCheckbox.checked = false;
                if (checkbox.checked) { if (!selectedBreeds.includes(checkbox.value)) selectedBreeds.push(checkbox.value); }
                else { selectedBreeds = selectedBreeds.filter(b => b !== checkbox.value); if (selectedBreeds.length === 0 && allCheckbox) allCheckbox.checked = true; }
            }
            updateBreedFilterDisplay();
            applyFilters();
        });
    });
};

const updateBreedFilterDisplay = () => {
    if (selectedBreeds.length === 0) { breedFilterText.textContent = 'Todas las razas'; selectedBreedsTags.innerHTML = ''; }
    else {
        breedFilterText.textContent = `${selectedBreeds.length} raza${selectedBreeds.length > 1 ? 's' : ''} seleccionada${selectedBreeds.length > 1 ? 's' : ''}`;
        selectedBreedsTags.innerHTML = selectedBreeds.map(breed => `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">${breed}<button type="button" class="ml-2 text-green-600 hover:text-green-800" data-breed="${breed}"><svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button></span>`).join('');
        selectedBreedsTags.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const breed = btn.dataset.breed;
                selectedBreeds = selectedBreeds.filter(b => b !== breed);
                const checkbox = document.querySelector(`.breed-checkbox[value="${breed}"]`);
                if (checkbox) checkbox.checked = false;
                if (selectedBreeds.length === 0) {
                    const allCheckbox = document.querySelector('.breed-checkbox[value="all"]');
                    if (allCheckbox) allCheckbox.checked = true;
                }
                updateBreedFilterDisplay();
                applyFilters();
            });
        });
    }
};

const toggleBreedDropdown = () => {
    breedFilterDropdown.classList.toggle('hidden');
};

const applyFilters = async () => {
    await loadAndRenderPets(true); // Usar la nueva función de recarga
};

const openPetDetailsModal = async (petId) => {
    const pet = await getPetDetails(petId);
    if (!pet) return;

    currentPetData = pet;

    const ownerProfile = pet.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) ? `${ownerProfile.first_name} ${ownerProfile.last_name}` : ownerProfile?.full_name || 'Sin dueño asignado';

    const reminder = getReminderStatus(pet.last_grooming_date, pet.reminder_frequency_days);
    const reminderColors = {
        gray: 'bg-gray-100 text-gray-800',
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
    };
    const reminderElement = document.querySelector('#modal-pet-reminder');
    if (reminderElement) {
        reminderElement.innerHTML = `<span class="px-3 py-1 text-sm font-semibold rounded-full ${reminderColors[reminder.color]}">${reminder.text}</span>`;
    }

    document.querySelector('#modal-pet-name').textContent = pet.name;
    document.querySelector('#modal-pet-breed').textContent = pet.breed || 'Raza no especificada';
    document.querySelector('#modal-pet-breed-detail').textContent = pet.breed || 'No especificada';
    document.querySelector('#modal-pet-sex').textContent = pet.sex || 'N/A';
    document.querySelector('#modal-pet-age').textContent = calculateAge(pet.birth_date) || 'N/A';
    document.querySelector('#modal-pet-weight').textContent = pet.weight ? `${pet.weight} kg` : 'N/A';
    document.querySelector('#modal-pet-size').textContent = pet.size || 'N/A';
    document.querySelector('#modal-pet-owner').textContent = ownerName;
    document.querySelector('#modal-pet-observations').textContent = pet.observations || 'Sin observaciones';

    const petImage = document.querySelector('#modal-pet-image');
    if (petImage) petImage.src = pet.image_url || `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${pet.name.charAt(0)}`;

    const appointmentsContainer = document.querySelector('#modal-pet-appointments');
    const appointments = pet.appointments || [];

    if (appointments.length > 0) {
        const lastAppointment = appointments[0];
        appointmentsContainer.innerHTML = `
            <div class="text-center">
                <p class="text-sm text-gray-600">Fecha: <span class="font-semibold">${lastAppointment.appointment_date}</span></p>
                <p class="text-sm text-gray-600">Hora: <span class="font-semibold">${lastAppointment.appointment_time}</span></p>
                <p class="text-sm text-gray-600 mt-2">${lastAppointment.service || 'Servicio general'}</p>
                <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    lastAppointment.status === 'completada' ? 'bg-green-100 text-green-800' :
                    lastAppointment.status === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                    lastAppointment.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                }">
                    ${lastAppointment.status}
                </span>
            </div>
        `;
    } else {
        appointmentsContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No hay servicios registrados.</p>';
    }

    const viewAllBtn = document.querySelector('#view-all-appointments-btn');
    if (viewAllBtn) {
        viewAllBtn.onclick = () => {
            window.location.href = `/public/modules/dashboard/dashboard-services.html?pet=${pet.id}&name=${encodeURIComponent(pet.name)}`;
        };
    }

    petViewMode.classList.remove('hidden');
    petEditMode.classList.add('hidden');
    editPetBtn.classList.remove('hidden');
    savePetBtn.classList.add('hidden');
    cancelEditBtn.classList.add('hidden');
    modalDeletePetBtn.classList.remove('hidden'); // <-- CÓDIGO AÑADIDO

    petDetailsModal.classList.remove('hidden');
};

const toggleReminderFields = (enable) => {
    if (reminderFieldsContainer) {
        reminderFieldsContainer.querySelectorAll('input, select, button').forEach(el => {
            el.disabled = !enable;
            el.classList.toggle('bg-gray-50', !enable);
        });
    }
    if (toggleReminderLabel) {
        toggleReminderLabel.textContent = enable ? 'Activado' : 'Desactivado';
        // Asume que los estilos del switch se manejan con la clase sr-only y :checked
        const dot = document.querySelector('#toggle-reminder-input + div .dot');
        const track = document.querySelector('#toggle-reminder-input + div');
        if (dot && track) {
            if (enable) {
                track.classList.add('bg-green-600');
                track.classList.remove('bg-gray-300');
                dot.classList.add('translate-x-full');
            } else {
                track.classList.add('bg-gray-300');
                track.classList.remove('bg-green-600');
                dot.classList.remove('translate-x-full');
            }
        }
    }
};

const switchToEditMode = () => {
    if (!currentPetData) return;

    document.querySelector('#edit-pet-id').value = currentPetData.id;
    document.querySelector('#edit-pet-name').value = currentPetData.name || '';
    document.querySelector('#edit-pet-breed').value = currentPetData.breed || '';
    document.querySelector('#edit-pet-sex').value = currentPetData.sex || 'Macho';
    document.querySelector('#edit-pet-birth-date').value = currentPetData.birth_date || '';
    document.querySelector('#edit-pet-weight').value = currentPetData.weight || '';
    document.querySelector('#edit-pet-size').value = currentPetData.size || 'Mediano';
    document.querySelector('#edit-pet-observations').value = currentPetData.observations || '';
    document.querySelector('#edit-reminder-frequency').value = currentPetData.reminder_frequency_days || '';
    editReminderStartDateInput.value = currentPetData.last_grooming_date || '';

    const isReminderActive = currentPetData.reminder_frequency_days > 0;
    if (toggleReminderInput) toggleReminderInput.checked = isReminderActive;
    toggleReminderFields(isReminderActive);

    if (editPetImagePreview) {
        editPetImagePreview.src = currentPetData.image_url || `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${currentPetData.name.charAt(0)}`;
    }
    photoFile = null;

    petViewMode.classList.add('hidden');
    petEditMode.classList.remove('hidden');
    editPetBtn.classList.add('hidden');
    savePetBtn.classList.remove('hidden');
    cancelEditBtn.classList.remove('hidden');
    modalDeletePetBtn.classList.add('hidden'); // <-- CÓDIGO AÑADIDO
};

const switchToViewMode = () => {
    petViewMode.classList.remove('hidden');
    petEditMode.classList.add('hidden');
    editPetBtn.classList.remove('hidden');
    savePetBtn.classList.add('hidden');
    cancelEditBtn.classList.add('hidden');
    modalDeletePetBtn.classList.remove('hidden'); // <-- CÓDIGO AÑADIDO
};

const savePetChanges = async () => {
    const petId = document.querySelector('#edit-pet-id').value;
    const isReminderActive = toggleReminderInput ? toggleReminderInput.checked : false;
    
    // Si no está activo, la frecuencia y fecha se guardan como NULL.
    let reminderFrequency = null;
    let reminderStartDate = null;

    if (isReminderActive) {
        reminderFrequency = parseInt(editReminderFrequencyInput.value) || null;
        reminderStartDate = editReminderStartDateInput.value || null;
        
        if (reminderFrequency === null || reminderFrequency < 1) {
            showMainAlert('Debes ingresar una frecuencia válida (mayor a 0) para guardar los recordatorios activos.', true); // <-- ALERTA DINÁMICA
            return;
        }
    }


    const updates = {
        name: document.querySelector('#edit-pet-name').value.trim(),
        breed: document.querySelector('#edit-pet-breed').value.trim(),
        sex: document.querySelector('#edit-pet-sex').value,
        birth_date: document.querySelector('#edit-pet-birth-date').value || null,
        weight: parseFloat(document.querySelector('#edit-pet-weight').value) || null,
        size: document.querySelector('#edit-pet-size').value,
        observations: document.querySelector('#edit-pet-observations').value.trim() || null,
        reminder_frequency_days: reminderFrequency,
        last_grooming_date: reminderStartDate
    };

    if (!updates.name || !updates.breed) {
        showMainAlert('El nombre y la raza son obligatorios', true); // <-- ALERTA DINÁMICA
        return;
    }

    savePetBtn.disabled = true;
    savePetBtn.textContent = 'Guardando...';

    if (photoFile) {
        try {
            const fileName = `public/${currentPetData.owner_id}/${Date.now()}_${photoFile.name}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('pet_galleries')
                .upload(fileName, photoFile);
            
            if (uploadError) {
                console.error('Error al subir imagen:', uploadError);
                showMainAlert('Error al subir la imagen: ' + uploadError.message, true); // <-- ALERTA DINÁMICA
                savePetBtn.disabled = false;
                savePetBtn.textContent = 'Guardar';
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('pet_galleries')
                .getPublicUrl(fileName);
            
            updates.image_url = publicUrl;
        } catch (error) {
            console.error('Error procesando imagen:', error);
            showMainAlert('Error al procesar la imagen', true); // <-- ALERTA DINÁMICA
            savePetBtn.disabled = false;
            savePetBtn.textContent = 'Guardar';
            return;
        }
    }

    const result = await updatePet(petId, updates);

    if (result.success) {
        showMainAlert('¡Mascota actualizada con éxito!', false); // <-- ALERTA DINÁMICA
        photoFile = null;
        await openPetDetailsModal(petId);
        await loadAndRenderPets(false); // <-- CÓDIGO ACTUALIZADO
    } else {
        showMainAlert('Error al actualizar la mascota: ' + (result.error?.message || 'Error desconocido'), true); // <-- ALERTA DINÁMICA
    }

    savePetBtn.disabled = false;
    savePetBtn.textContent = 'Guardar';
};

const closePetDetailsModal = () => {
    petDetailsModal.classList.add('hidden');
    currentPetData = null;
    switchToViewMode();
};

// --- INICIO: CÓDIGO AÑADIDO (Lógica modal borrado mascota) ---
const openDeletePetModal = () => {
    if (!currentPetData) return;
    deletePetName.textContent = currentPetData.name;
    deletePetErrorMessage.classList.add('hidden');
    confirmDeletePetBtn.disabled = false;
    confirmDeletePetBtn.textContent = 'Sí, Eliminar';
    deletePetConfirmModal.classList.remove('hidden');
};

const closeDeletePetModal = () => {
    deletePetConfirmModal.classList.add('hidden');
};

const handleDeletePet = async () => {
    if (!currentPetData) return;

    confirmDeletePetBtn.disabled = true;
    confirmDeletePetBtn.textContent = 'Eliminando...';
    deletePetErrorMessage.classList.add('hidden');

    const { success, error } = await deletePet(currentPetData.id);

    if (success) {
        closeDeletePetModal();
        closePetDetailsModal();
        showMainAlert('Mascota eliminada exitosamente.', false);
        await loadAndRenderPets(true); // Recargar la lista
    } else {
        deletePetErrorMessage.textContent = `Error: ${error.message}`;
        deletePetErrorMessage.classList.remove('hidden');
        confirmDeletePetBtn.disabled = false;
        confirmDeletePetBtn.textContent = 'Sí, Eliminar';
    }
};
// --- FIN: CÓDIGO AÑADIDO ---

const initializePetsSection = async () => {
    // --- INICIO: CÓDIGO ACTUALIZADO ---
    if (isInitialized) {
        await loadAndRenderPets(true);
        return;
    }
    isInitialized = true;
    // --- FIN: CÓDIGO ACTUALIZADO ---

    if (headerTitle) headerTitle.textContent = 'Gestión de Mascotas';

    const stats = await getStats();
    if (totalPetsCount) totalPetsCount.textContent = stats.totalPets;
    if (dogsCount) dogsCount.textContent = stats.dogs;
    if (appointmentsMonthCount) appointmentsMonthCount.textContent = stats.appointmentsMonth;

    await renderBreedOptions();
    await loadAndRenderPets(true); // <-- CÓDIGO ACTUALIZADO

    if (petSearchInput) petSearchInput.addEventListener('input', applyFilters);

    if (breedFilterBtn) breedFilterBtn.addEventListener('click', toggleBreedDropdown);

    if (editPetPhoto) {
        editPetPhoto.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                photoFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (editPetImagePreview) editPetImagePreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (editSetLastServiceDateBtn) {
        editSetLastServiceDateBtn.addEventListener('click', async () => {
            editSetLastServiceDateBtn.disabled = true;
            editSetLastServiceDateBtn.textContent = 'Buscando...';
            
            const lastDate = await getPetLastServiceDate(currentPetData.id);
            
            if (lastDate) {
                editReminderStartDateInput.value = lastDate;
                editSetLastServiceDateBtn.textContent = '¡Fecha establecida! (Usar Última Cita Completada)';
            } else {
                editSetLastServiceDateBtn.textContent = 'No se encontró cita completada.';
                editReminderStartDateInput.value = '';
            }

            setTimeout(() => {
                editSetLastServiceDateBtn.textContent = 'Usar Última Cita Completada';
                editSetLastServiceDateBtn.disabled = false;
            }, 3000);
        });
    }

    if (toggleReminderInput) {
        toggleReminderInput.addEventListener('change', (e) => {
            toggleReminderFields(e.target.checked);
        });
    }

    document.addEventListener('click', (e) => {
        if (breedFilterBtn && breedFilterDropdown && !breedFilterBtn.contains(e.target) && !breedFilterDropdown.contains(e.target)) {
            breedFilterDropdown.classList.add('hidden');
        }
    });

    if (closeModalBtn) closeModalBtn.addEventListener('click', closePetDetailsModal);
    if (closeModalBottomBtn) closeModalBottomBtn.addEventListener('click', closePetDetailsModal);
    if (editPetBtn) editPetBtn.addEventListener('click', switchToEditMode);
    if (savePetBtn) savePetBtn.addEventListener('click', savePetChanges);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', switchToViewMode);
    
    if (addAppointmentFromPetBtn) {
        addAppointmentFromPetBtn.addEventListener('click', () => {
            if (currentPetData && currentPetData.profiles) {
                const petId = currentPetData.id;
                const clientId = currentPetData.profiles.id;
                window.location.href = `/public/modules/dashboard/dashboard-appointments.html?clientId=${clientId}&petId=${petId}`;
            } else {
                showMainAlert('No se pueden cargar los datos del cliente para agendar la cita.', true); // <-- ALERTA DINÁMICA
            }
        });
    }

    // --- INICIO: CÓDIGO AÑADIDO (Listeners modal borrado mascota) ---
    if (modalDeletePetBtn) modalDeletePetBtn.addEventListener('click', openDeletePetModal);
    if (cancelDeletePetBtn) cancelDeletePetBtn.addEventListener('click', closeDeletePetModal);
    if (confirmDeletePetBtn) confirmDeletePetBtn.addEventListener('click', handleDeletePet);
    if (deletePetConfirmModal) {
        deletePetConfirmModal.addEventListener('click', (e) => {
            if (e.target === deletePetConfirmModal) closeDeletePetModal();
        });
    }
    // --- FIN: CÓDIGO AÑADIDO ---

    if (petsTableBody) {
        petsTableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('.view-details-btn');
            if (button) {
                const row = button.closest('tr');
                const petId = row.dataset.petId;
                await openPetDetailsModal(petId);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', initializePetsSection)
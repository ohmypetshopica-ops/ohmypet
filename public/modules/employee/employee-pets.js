// public/modules/employee/employee-pets.js
// Módulo de gestión de mascotas

import { state, updateState } from './employee-state.js';
// --- INICIO: CÓDIGO ACTUALIZADO ---
// Se importa 'deletePet' y 'getClientsWithPets' (para los nombres de los dueños)
import { deletePet, getClientsWithPets, getAppointmentPhotos } from '../dashboard/dashboard.api.js';
// --- FIN: CÓDIGO ACTUALIZADO ---
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let petSearch, petsList, petsListView, petDetailsView, petDetailsContent, backToPetsBtn;
let addPetModalEmployee, closeAddPetModalButtonEmployee, cancelAddPetButtonEmployee, petFormEmployee, petFormMessageEmployee;
let clearPetSearchBtn;
let paginationContainerPets;

// --- INICIO: CÓDIGO ACTUALIZADO (Selectores Limpiados) ---
// Elementos de la vista de detalles
let petDetailsActions;
let modalDeletePetBtnEmployee;

// Elementos del Modal Eliminar Mascota
let deletePetConfirmModalEmployee;
let deletePetNameEmployee;
let cancelDeletePetBtnEmployee;
let confirmDeletePetBtnEmployee;
let deletePetErrorMessageEmployee;

// --- INICIO: CÓDIGO AÑADIDO (Modal Historial) ---
let historyModalEmployee, closeHistoryModalBtn, closeHistoryModalBtnBottom;
let historyPetName, historyArrivalPhoto, historyDeparturePhoto;
let historyPrice, historyWeight, historyPayment, historyShampoo, historyObservations;
let currentPetAppointments = []; // Para guardar las citas de la mascota
// --- FIN: CÓDIGO AÑADIDO ---
// --- FIN: CÓDIGO ACTUALIZADO ---


// Variables de paginación
let currentPagePets = 1;
const itemsPerPagePets = 8;
let currentPetForDetails = null; // Para guardar la mascota seleccionada

export const initPetElements = () => {
    petSearch = document.getElementById('pet-search');
    petsList = document.getElementById('pets-list');
    petsListView = document.getElementById('pets-list-view');
    petDetailsView = document.getElementById('pet-details-view');
    petDetailsContent = document.getElementById('pet-details-content');
    backToPetsBtn = document.getElementById('back-to-pets-btn');
    
    // Esto es para el modal que se abre desde "Clientes"
    addPetModalEmployee = document.querySelector('#add-pet-modal-employee');
    closeAddPetModalButtonEmployee = document.querySelector('#submit-add-pet-button-employee'); 
    cancelAddPetButtonEmployee = document.querySelector('#cancel-add-pet-button-employee');
    petFormEmployee = document.querySelector('#pet-form-employee');
    petFormMessageEmployee = document.querySelector('#pet-form-message-employee');

    clearPetSearchBtn = document.getElementById('clear-pet-search-btn');
    paginationContainerPets = document.getElementById('pagination-container-pets');

    // --- INICIO: CÓDIGO ACTUALIZADO (Inicialización de nuevos elementos) ---
    petDetailsActions = document.getElementById('pet-details-actions');
    modalDeletePetBtnEmployee = document.getElementById('modal-delete-pet-btn-employee');

    deletePetConfirmModalEmployee = document.getElementById('delete-pet-confirm-modal-employee');
    deletePetNameEmployee = document.getElementById('delete-pet-name-employee');
    cancelDeletePetBtnEmployee = document.getElementById('cancel-delete-pet-btn-employee');
    confirmDeletePetBtnEmployee = document.getElementById('confirm-delete-pet-btn-employee');
    deletePetErrorMessageEmployee = document.getElementById('delete-pet-error-message-employee');

    // --- INICIO: CÓDIGO AÑADIDO (Inicialización Modal Historial) ---
    historyModalEmployee = document.getElementById('history-modal-employee');
    closeHistoryModalBtn = document.getElementById('close-history-modal-btn');
    closeHistoryModalBtnBottom = document.getElementById('close-history-modal-btn-bottom');
    historyPetName = document.getElementById('history-pet-name');
    historyArrivalPhoto = document.getElementById('history-arrival-photo');
    historyDeparturePhoto = document.getElementById('history-departure-photo');
    historyPrice = document.getElementById('history-price');
    historyWeight = document.getElementById('history-weight');
    historyPayment = document.getElementById('history-payment');
    historyShampoo = document.getElementById('history-shampoo');
    historyObservations = document.getElementById('history-observations');
    // --- FIN: CÓDIGO AÑADIDO ---
    // --- FIN: CÓDIGO ACTUALIZADO ---
};

export const setupPetListeners = () => {
    if (petSearch) {
        petSearch.addEventListener('input', handlePetSearch);
    }
    if (clearPetSearchBtn) {
        clearPetSearchBtn.addEventListener('click', () => {
            currentPagePets = 1;
            petSearch.value = '';
            clearPetSearchBtn.classList.add('hidden');
            handlePetSearch({ target: petSearch });
        });
    }

    backToPetsBtn?.addEventListener('click', showPetsList);
    
    petsList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.pet-btn');
        if (btn) showPetDetails(btn.dataset.petId);
    });
    
    // --- INICIO: CÓDIGO ACTUALIZADO (Listeners de borrado) ---
    modalDeletePetBtnEmployee?.addEventListener('click', openDeletePetModalEmployee);
    cancelDeletePetBtnEmployee?.addEventListener('click', closeDeletePetModalEmployee);
    confirmDeletePetBtnEmployee?.addEventListener('click', handleDeletePetEmployee);
    deletePetConfirmModalEmployee?.addEventListener('click', (e) => {
        if (e.target === deletePetConfirmModalEmployee) closeDeletePetModalEmployee();
    });
    // --- FIN: CÓDIGO ACTUALIZADO ---
    
    // --- INICIO: CÓDIGO AÑADIDO (Listeners Modal Historial) ---
    closeHistoryModalBtn?.addEventListener('click', closeHistoryModalEmployee);
    closeHistoryModalBtnBottom?.addEventListener('click', closeHistoryModalEmployee);
    historyModalEmployee?.addEventListener('click', (e) => {
        if (e.target === historyModalEmployee) closeHistoryModalEmployee();
    });
    // --- FIN: CÓDIGO AÑADIDO ---
};

const handlePetSearch = (e) => {
    currentPagePets = 1;
    const term = e.target.value.toLowerCase();
    
    if (term.length > 0) {
        clearPetSearchBtn?.classList.remove('hidden');
    } else {
        clearPetSearchBtn?.classList.add('hidden');
    }

    const filtered = term ? state.allPets.filter(pet => {
        const owner = state.allClients.find(c => c.id === pet.owner_id);
        const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.toLowerCase() : 'dueño desconocido';
        return pet.name.toLowerCase().includes(term) || ownerName.includes(term) || (pet.breed || '').toLowerCase().includes(term);
    }) : state.allPets;
    renderPets(filtered);
};

// ====== FUNCIÓN DE PAGINACIÓN MEJORADA ======
const renderPaginationPets = (totalItems) => {
    if (!paginationContainerPets) return;

    const totalPages = Math.ceil(totalItems / itemsPerPagePets);
    if (totalPages <= 1) {
        paginationContainerPets.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2">';

    // Botón Anterior
    const prevDisabled = currentPagePets === 1;
    paginationHTML += `
        <button data-page="${currentPagePets - 1}" 
                class="px-3 py-2 border rounded-lg transition-colors ${prevDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}" 
                ${prevDisabled ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
        </button>
    `;

    // Lógica para mostrar solo 3 números centrados en la página actual
    let startPage = Math.max(1, currentPagePets - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    
    // Ajustar si estamos cerca del final
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    // Números de página (máximo 3)
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPagePets 
            ? 'bg-green-600 text-white' 
            : 'bg-white hover:bg-gray-50 text-gray-700';
        paginationHTML += `
            <button data-page="${i}" 
                    class="w-10 h-10 border rounded-lg font-medium transition-colors ${activeClass}">
                ${i}
            </button>
        `;
    }

    // Botón Siguiente
    const nextDisabled = currentPagePets === totalPages;
    paginationHTML += `
        <button data-page="${currentPagePets + 1}" 
                class="px-3 py-2 border rounded-lg transition-colors ${nextDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}" 
                ${nextDisabled ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        </button>
    `;

    paginationHTML += '</div>';
    paginationContainerPets.innerHTML = paginationHTML;

    paginationContainerPets.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const newPage = parseInt(button.dataset.page);
            if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                currentPagePets = newPage;
                const searchTerm = petSearch.value.toLowerCase();
                const filtered = searchTerm ? state.allPets.filter(pet => {
                    const owner = state.allClients.find(c => c.id === pet.owner_id);
                    const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.toLowerCase() : 'dueño desconocido';
                    return pet.name.toLowerCase().includes(searchTerm) || ownerName.includes(searchTerm) || (pet.breed || '').toLowerCase().includes(searchTerm);
                }) : state.allPets;
                renderPets(filtered);
            }
        });
    });
};

export const renderPets = (pets) => {
    if (!petsList) return;
    
    const startIndex = (currentPagePets - 1) * itemsPerPagePets;
    const endIndex = startIndex + itemsPerPagePets;
    const paginatedPets = pets.slice(startIndex, endIndex);
    
    petsList.innerHTML = paginatedPets.length > 0 ? paginatedPets.map(pet => {
        const owner = state.allClients.find(c => c.id === pet.owner_id);
        const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}` : 'Dueño desconocido';
        
        const petImage = pet.image_url 
            ? pet.image_url 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name || 'M')}&background=10B981&color=FFFFFF`;
        
        return `
            <button data-pet-id="${pet.id}" class="pet-btn w-full text-left bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50 flex items-center space-x-3">
                <img src="${petImage}" alt="${pet.name}" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-gray-800 truncate">${pet.name}</h3>
                    <p class="text-sm text-gray-600 truncate">${pet.breed || 'Sin raza'}</p>
                    <p class="text-xs text-gray-500 truncate">${ownerName}</p>
                </div>
            </button>
        `;
    }).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron mascotas.</p>`;

    renderPaginationPets(pets.length);
};

const showPetsList = () => {
    petsListView?.classList.remove('hidden');
    petDetailsView?.classList.add('hidden');
    updateState('currentPetId', null);
    currentPetForDetails = null; // Limpiar mascota seleccionada
    currentPetAppointments = []; // Limpiar citas
};

const showPetDetails = async (petId) => {
    updateState('currentPetId', petId);
    petsListView?.classList.add('hidden');
    petDetailsView?.classList.remove('hidden');
    
    petDetailsContent.innerHTML = '<p class="text-center text-gray-500 mt-8">Cargando detalles...</p>';
    
    const pet = state.allPets.find(p => p.id === petId);
    if (!pet) {
        petDetailsContent.innerHTML = '<p class="text-center text-red-500 mt-8">Mascota no encontrada.</p>';
        return;
    }
    
    currentPetForDetails = pet; // Guardar mascota actual

    const owner = state.allClients.find(c => c.id === pet.owner_id);
    const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Dueño desconocido' : 'Dueño desconocido';

    // --- INICIO: CÓDIGO ACTUALIZADO ---
    // Pedir más datos de las citas, incluyendo fotos
    const { data: appointments } = await supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, status,
            final_weight, payment_method, final_observations, shampoo_type, service_price,
            appointment_photos ( photo_type, image_url )
        `)
        .eq('pet_id', petId)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

    currentPetAppointments = appointments || []; // Guardar citas en el estado
    const lastAppointment = currentPetAppointments.length > 0 ? currentPetAppointments[0] : null;
    // --- FIN: CÓDIGO ACTUALIZADO ---

    const calculateAge = (birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate + 'T00:00:00');
        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        if (months < 0) { years--; months += 12; }
        if (years > 0) return `${years} año${years > 1 ? 's' : ''}`;
        return `${months} mes${months !== 1 ? 'es' : ''}`;
    };

    const ageDisplay = calculateAge(pet.birth_date) || 'Edad desconocida';

    const petImage = pet.image_url 
        ? pet.image_url 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name || 'M')}&background=10B981&color=FFFFFF`;
        
    // --- INICIO: CÓDIGO ACTUALIZADO (Historial clickeable) ---
    const historyHTML = currentPetAppointments.length > 0 
        ? currentPetAppointments.map(app => `
            <div data-history-id="${app.id}" class="history-item-btn bg-gray-50 p-3 rounded-lg border-l-4 border-green-400 cursor-pointer hover:bg-gray-100 transition-colors">
                <p class="font-bold text-sm text-gray-800">${app.appointment_date} - ${app.appointment_time.slice(0, 5)}</p>
                <p class="text-xs text-gray-700 mt-1">Servicio: ${app.service || 'N/A'}</p>
                <p class="text-xs text-gray-600 truncate">Obs: ${app.final_observations || 'Sin observaciones'}</p>
            </div>
        `).join('')
        : '<p class="text-sm text-gray-500">No hay historial de servicios completados.</p>';
    // --- FIN: CÓDIGO ACTUALIZADO ---

    
    petDetailsContent.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center space-x-4 mb-6 pb-4 border-b border-gray-200">
                <img src="${petImage}" 
                     alt="${pet.name}" 
                     class="w-24 h-24 rounded-full object-cover border-4 border-green-200 flex-shrink-0">
                <div>
                    <h3 class="font-bold text-3xl">${pet.name}</h3>
                    <p class="text-lg text-gray-600">${pet.breed || 'Raza no especificada'}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Raza</p>
                    <p class="font-bold text-gray-800">${pet.breed || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Sexo</p>
                    <p class="font-bold text-gray-800">${pet.sex || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Edad</p>
                    <p class="font-bold text-gray-800">${ageDisplay}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Peso</p>
                    <p class="font-bold text-gray-800">${pet.weight ? `${pet.weight} kg` : 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Tamaño</p>
                    <p class="font-bold text-gray-800">${pet.size || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Dueño</p>
                    <p class="font-bold text-gray-800"><a href="tel:${owner?.phone || ''}" class="text-blue-600">${ownerName}</a></p>
                </div>
            </div>

            <div class="bg-yellow-50 p-4 rounded-xl mb-6 border border-yellow-200">
                <p class="text-sm font-semibold text-yellow-800 mb-1 flex items-center">
                    <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Instrucciones Especiales
                </p>
                <p class="text-sm text-gray-800">${pet.observations || 'Sin observaciones'}</p>
            </div>

            <div id="history-block-button" class="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-200 ${lastAppointment ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}">
                <h4 class="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Último Servicio (Completado)
                </h4>
                ${lastAppointment ? `
                    <div class="bg-white p-3 rounded-lg shadow-sm space-y-1">
                        <p class="text-sm"><strong>Fecha:</strong> ${lastAppointment.appointment_date} (${lastAppointment.appointment_time.slice(0, 5)})</p>
                        <p class="text-sm"><strong>Servicio:</strong> ${lastAppointment.service || 'N/A'}</p>
                        <div class="grid grid-cols-2 text-sm">
                            <p><strong>Peso Final:</strong> ${lastAppointment.final_weight ? `${lastAppointment.final_weight} kg` : 'N/A'}</p>
                            <p><strong>Pago:</strong> S/ ${lastAppointment.service_price ? lastAppointment.service_price.toFixed(2) : 'N/A'} (${lastAppointment.payment_method || 'N/A'})</p>
                            </div>
                        ${lastAppointment.final_observations ? `<p class="text-xs text-gray-600 mt-2"><strong>Obs.:</strong> ${lastAppointment.final_observations}</p>` : ''}
                        <p class="text-xs text-blue-600 font-semibold text-right mt-2">Ver detalles y fotos &rarr;</p>
                    </div>
                ` : '<p class="text-sm text-gray-500">Sin servicios completados.</p>'}
            </div>

            <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3">Historial de Servicios</h4>
                <div id="pet-history-list" class="space-y-2 max-h-64 overflow-y-auto">${historyHTML}</div>
            </div>
        </div>
    `;

    // --- INICIO: CÓDIGO ACTUALIZADO ---
    // Corregir el error de la consola (eliminando referencia a petDetailsContentEdit)
    petDetailsContent?.classList.remove('hidden');
    petDetailsActions?.classList.remove('hidden');
    
    // Añadir listeners para los nuevos elementos de historial
    const historyBlock = document.getElementById('history-block-button');
    if (historyBlock && lastAppointment) {
        historyBlock.addEventListener('click', () => {
            openHistoryModalEmployee(lastAppointment, pet.name);
        });
    }

    document.querySelectorAll('.history-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const appId = btn.dataset.historyId;
            const appData = currentPetAppointments.find(a => a.id == appId);
            if (appData) {
                openHistoryModalEmployee(appData, pet.name);
            }
        });
    });
    // --- FIN: CÓDIGO ACTUALIZADO ---
};


// --- INICIO: CÓDIGO AÑADIDO (Lógica modal historial) ---
const openHistoryModalEmployee = (appointment, petName) => {
    if (!appointment) return;
    
    historyPetName.textContent = `Mascota: ${petName} (Servicio del ${appointment.appointment_date})`;
    
    const photos = appointment.appointment_photos || [];
    // CORRECCIÓN: Las fotos en el panel de empleado se llaman 'before' y 'after'
    // PERO las fotos del dashboard de admin se llaman 'arrival' y 'departure'. 
    // Usamos ambas para ser robustos.
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival' || p.photo_type === 'before');
    const departurePhoto = photos.find(p => p.photo_type === 'departure' || p.photo_type === 'after');

    if (arrivalPhoto) {
        historyArrivalPhoto.innerHTML = `<img src="${arrivalPhoto.image_url}" alt="Foto de llegada" class="w-full h-full object-cover rounded-lg">`;
    } else {
        historyArrivalPhoto.innerHTML = `<p class="text-sm text-gray-500">Sin foto</p>`;
    }

    if (departurePhoto) {
        historyDeparturePhoto.innerHTML = `<img src="${departurePhoto.image_url}" alt="Foto de salida" class="w-full h-full object-cover rounded-lg">`;
    } else {
        historyDeparturePhoto.innerHTML = `<p class="text-sm text-gray-500">Sin foto</p>`;
    }

    historyPrice.textContent = appointment.service_price ? `S/ ${appointment.service_price.toFixed(2)}` : 'N/A';
    historyWeight.textContent = appointment.final_weight ? `${appointment.final_weight} kg` : 'N/A';
    historyPayment.textContent = (appointment.payment_method || 'N/A').toUpperCase();
    historyShampoo.textContent = appointment.shampoo_type || 'General';
    historyObservations.textContent = appointment.final_observations || 'Sin observaciones.';

    historyModalEmployee?.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Bloquear scroll del body
};

const closeHistoryModalEmployee = () => {
    historyModalEmployee?.classList.add('hidden');
    document.body.style.overflow = ''; // Desbloquear scroll
};
// --- FIN: CÓDIGO AÑADIDO ---


// --- INICIO: CÓDIGO AÑADIDO (Lógica modal borrado mascota) ---
const openDeletePetModalEmployee = () => {
    if (!currentPetForDetails) return;
    
    deletePetNameEmployee.textContent = currentPetForDetails.name;
    deletePetErrorMessageEmployee.classList.add('hidden');
    confirmDeletePetBtnEmployee.disabled = false;
    confirmDeletePetBtnEmployee.textContent = 'Sí, Eliminar';
    deletePetConfirmModalEmployee.classList.remove('hidden');
};

const closeDeletePetModalEmployee = () => {
    deletePetConfirmModalEmployee.classList.add('hidden');
};

const handleDeletePetEmployee = async () => {
    if (!currentPetForDetails) return;

    confirmDeletePetBtnEmployee.disabled = true;
    confirmDeletePetBtnEmployee.textContent = 'Eliminando...';
    
    const { success, error } = await deletePet(currentPetForDetails.id);

    if (success) {
        closeDeletePetModalEmployee();
        showPetsList(); // Volver a la lista
        
        // Recargar datos
        const clientsData = await getClientsWithPets();
        updateState('clientsWithPets', clientsData);
        const allPets = clientsData.flatMap(client =>
            client.pets ? client.pets.map(pet => ({ ...pet, owner_id: client.id })) : []
        );
        updateState('allPets', allPets);
        renderPets(allPets); // Actualizar la lista principal

    } else {
        deletePetErrorMessageEmployee.textContent = `Error: ${error.message}`;
        deletePetErrorMessageEmployee.classList.remove('hidden');
        confirmDeletePetBtnEmployee.disabled = false;
        confirmDeletePetBtnEmployee.textContent = 'Sí, Eliminar';
    }
};
// --- FIN: CÓDIGO AÑADIDO ---


const closePetModal = () => {
    addPetModalEmployee?.classList.add('hidden');
    petFormEmployee?.reset();
    petFormMessageEmployee?.classList.add('hidden');
};
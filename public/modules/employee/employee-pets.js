// public/modules/employee/employee-pets.js
// Módulo de gestión de mascotas (WhatsApp SOLO en detalles)

import { state, updateState } from './employee-state.js';
import { supabase } from '../../core/supabase.js';
import { openAddAppointmentWithPreselection } from './employee-appointments.js';

// Elementos del DOM
let petSearch, petsList, petsListView, petDetailsView, petDetailsContent, backToPetsBtn;
let addPetModalEmployee, closeAddPetModalButtonEmployee, cancelAddPetButtonEmployee, petFormEmployee, petFormMessageEmployee;
let clearPetSearchBtn;
let paginationContainerPets;

// Modal Historial
let historyModalEmployee, closeHistoryModalBtn, closeHistoryModalBtnBottom;
let historyPetName, historyArrivalPhoto, historyDeparturePhoto;
let historyPrice, historyWeight, historyPayment, historyShampoo, historyObservations;
let currentPetAppointments = []; 

// Variables de paginación
let currentPagePets = 1;
const itemsPerPagePets = 8;
let currentPetForDetails = null; 

export const initPetElements = () => {
    petSearch = document.getElementById('pet-search');
    petsList = document.getElementById('pets-list');
    petsListView = document.getElementById('pets-list-view');
    petDetailsView = document.getElementById('pet-details-view');
    petDetailsContent = document.getElementById('pet-details-content');
    backToPetsBtn = document.getElementById('back-to-pets-btn');
    
    addPetModalEmployee = document.querySelector('#add-pet-modal-employee');
    closeAddPetModalButtonEmployee = document.querySelector('#submit-add-pet-button-employee'); 
    cancelAddPetButtonEmployee = document.querySelector('#cancel-add-pet-button-employee');
    petFormEmployee = document.querySelector('#pet-form-employee');
    petFormMessageEmployee = document.querySelector('#pet-form-message-employee');

    clearPetSearchBtn = document.getElementById('clear-pet-search-btn');
    paginationContainerPets = document.getElementById('pagination-container-pets');

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
    
    // Delegación estándar (clic en toda la tarjeta abre detalle)
    petsList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.pet-btn');
        if (btn) {
            showPetDetails(btn.dataset.petId);
        }
    });
    
    closeHistoryModalBtn?.addEventListener('click', closeHistoryModalEmployee);
    closeHistoryModalBtnBottom?.addEventListener('click', closeHistoryModalEmployee);
    historyModalEmployee?.addEventListener('click', (e) => {
        if (e.target === historyModalEmployee) closeHistoryModalEmployee();
    });
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

const renderPaginationPets = (totalItems) => {
    if (!paginationContainerPets) return;

    const totalPages = Math.ceil(totalItems / itemsPerPagePets);
    if (totalPages <= 1) {
        paginationContainerPets.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2">';

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

    let startPage = Math.max(1, currentPagePets - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

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
        
        // LISTA LIMPIA: Sin teléfono ni WhatsApp aquí
        return `
            <button data-pet-id="${pet.id}" class="pet-btn w-full text-left bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50 flex items-center space-x-3 transition-colors">
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
    currentPetForDetails = null; 
    currentPetAppointments = [];
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
    
    currentPetForDetails = pet;

    const owner = state.allClients.find(c => c.id === pet.owner_id);
    const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Dueño desconocido' : 'Dueño desconocido';
    const ownerPhone = owner?.phone || '';

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

    currentPetAppointments = appointments || []; 
    const lastAppointment = currentPetAppointments.length > 0 ? currentPetAppointments[0] : null;

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
        
    const historyHTML = currentPetAppointments.length > 0 
        ? currentPetAppointments.map(app => `
            <div data-history-id="${app.id}" class="history-item-btn bg-gray-50 p-3 rounded-lg border-l-4 border-green-400 cursor-pointer hover:bg-gray-100 transition-colors">
                <p class="font-bold text-sm text-gray-800">${app.appointment_date} - ${app.appointment_time.slice(0, 5)}</p>
                <p class="text-xs text-gray-700 mt-1">Servicio: ${app.service || 'N/A'}</p>
                <p class="text-xs text-gray-600 truncate">Obs: ${app.final_observations || 'Sin observaciones'}</p>
            </div>
        `).join('')
        : '<p class="text-sm text-gray-500">No hay historial de servicios completados.</p>';

    // Crear enlace de WhatsApp para mostrarlo SOLO en los detalles
    const whatsappLink = ownerPhone && ownerPhone.length >= 9
        ? `<a href="https://wa.me/51${ownerPhone.replace(/\D/g,'')}" target="_blank" class="text-green-600 font-bold hover:underline flex items-center gap-1">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.986.597 1.973 1.016 3.275 1.016 3.181 0 5.768-2.587 5.768-5.766.001-3.187-2.575-5.77-5.768-5.771l1.771 1.768zm3.576 8.011c-.147.413-.86.758-1.203.796-.373.042-2.508-.246-4.519-2.246-1.814-1.814-2.109-3.559-2.227-4.049-.11-.46-.03-.762.154-1.014.14-.193.38-.396.572-.396.17 0 .318.011.444.072.175.083.819 1.665.911 1.84.062.119.024.26-.106.496-.094.174-.344.392-.486.526-.149.141-.295.289.057.905.726 1.263 1.906 2.12 2.552 2.386.292.12.573.077.778-.14.236-.25.553-.79.711-1.096.159-.305.332-.253.606-.147 1.607.765 1.931.95 2.027 1.123.098.176.098.881-.047 1.296z"></path></svg>
            ${ownerPhone}
           </a>`
        : '<span class="text-gray-400">Sin teléfono</span>';
    
    petDetailsContent.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 mb-6 gap-4">
                <div class="flex items-center space-x-4">
                    <img src="${petImage}" 
                         alt="${pet.name}" 
                         class="w-24 h-24 rounded-full object-cover border-4 border-green-200 flex-shrink-0">
                    <div>
                        <h3 class="font-bold text-3xl">${pet.name}</h3>
                        <p class="text-lg text-gray-600">${pet.breed || 'Raza no especificada'}</p>
                    </div>
                </div>
                <button id="schedule-appt-btn-details" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Agendar Cita
                </button>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Dueño</p>
                    <p class="font-bold text-gray-800">${ownerName}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-gray-500">Contacto</p>
                    ${whatsappLink}
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

    petDetailsContent?.classList.remove('hidden');
    
    const scheduleBtn = document.getElementById('schedule-appt-btn-details');
    if (scheduleBtn && owner) {
        scheduleBtn.addEventListener('click', () => {
            const appointmentsNavBtn = document.querySelector('.nav-btn[data-view="appointments"]');
            if (appointmentsNavBtn) appointmentsNavBtn.click();
            openAddAppointmentWithPreselection(owner, pet);
        });
    }

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
};

const openHistoryModalEmployee = (appointment, petName) => {
    if (!appointment) return;
    
    historyPetName.textContent = `Mascota: ${petName} (Servicio del ${appointment.appointment_date})`;
    
    const photos = appointment.appointment_photos || [];
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
    document.body.style.overflow = 'hidden';
};

const closeHistoryModalEmployee = () => {
    historyModalEmployee?.classList.add('hidden');
    document.body.style.overflow = '';
};
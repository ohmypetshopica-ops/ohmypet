// public/modules/employee/employee-pets.js
// Módulo de gestión de mascotas

import { state, updateState } from './employee-state.js';
import { addPetFromDashboard } from '../dashboard/dashboard.api.js';
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let petSearch, petsList, petsListView, petDetailsView, petDetailsContent, backToPetsBtn;
let addPetModalEmployee, closeAddPetModalButtonEmployee, cancelAddPetButtonEmployee, petFormEmployee, petFormMessageEmployee;
let clearPetSearchBtn;
let addPetToClientBtn; 
let paginationContainerPets; // ====== ELEMENTO AGREGADO ======

// ====== VARIABLES AGREGADAS PARA PAGINACIÓN ======
let currentPagePets = 1;
const itemsPerPagePets = 8; // Número de mascotas por página
// ====== FIN VARIABLES AGREGADAS ======


export const initPetElements = () => {
    petSearch = document.getElementById('pet-search');
    petsList = document.getElementById('pets-list');
    petsListView = document.getElementById('pets-list-view');
    petDetailsView = document.getElementById('pet-details-view');
    petDetailsContent = document.getElementById('pet-details-content');
    backToPetsBtn = document.getElementById('back-to-pets-btn');
    
    addPetToClientBtn = document.querySelector('#add-pet-to-client-btn'); 
    
    addPetModalEmployee = document.querySelector('#add-pet-modal-employee');
    closeAddPetModalButtonEmployee = document.querySelector('#close-add-pet-modal-button-employee');
    cancelAddPetButtonEmployee = document.querySelector('#cancel-add-pet-button-employee');
    petFormEmployee = document.querySelector('#pet-form-employee');
    petFormMessageEmployee = document.querySelector('#pet-form-message-employee');

    clearPetSearchBtn = document.getElementById('clear-pet-search-btn');
    paginationContainerPets = document.getElementById('pagination-container-pets'); // ====== INICIALIZACIÓN AGREGADA ======
};

export const setupPetListeners = () => {
    if (petSearch) {
        petSearch.addEventListener('input', handlePetSearch);
    }
    if (clearPetSearchBtn) {
        clearPetSearchBtn.addEventListener('click', () => {
            currentPagePets = 1; // ====== LÍNEA AGREGADA ======
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
    
    closeAddPetModalButtonEmployee?.addEventListener('click', closePetModal);
    cancelAddPetButtonEmployee?.addEventListener('click', cancelAddPetButtonEmployee);
    petFormEmployee?.addEventListener('submit', handleAddPet);
};

const handlePetSearch = (e) => {
    currentPagePets = 1; // ====== LÍNEA AGREGADA: Reiniciar página al buscar ======
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

// ====== FUNCIÓN DE RENDERIZADO DE PAGINACIÓN AGREGADA ======
const renderPaginationPets = (totalItems) => {
    if (!paginationContainerPets) return;

    const totalPages = Math.ceil(totalItems / itemsPerPagePets);
    if (totalPages <= 1) {
        paginationContainerPets.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center space-x-2">';

    paginationHTML += `
        <button data-page="${currentPagePets - 1}" class="px-3 py-1 border rounded-lg ${currentPagePets === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}" ${currentPagePets === 1 ? 'disabled' : ''}>
            Anterior
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPagePets ? 'bg-green-600 text-white' : 'bg-white hover:bg-gray-50';
        paginationHTML += `<button data-page="${i}" class="px-3 py-1 border rounded-lg ${activeClass}">${i}</button>`;
    }

    paginationHTML += `
        <button data-page="${currentPagePets + 1}" class="px-3 py-1 border rounded-lg ${currentPagePets === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}" ${currentPagePets === totalPages ? 'disabled' : ''}>
            Siguiente
        </button>
    `;

    paginationHTML += '</div>';
    paginationContainerPets.innerHTML = paginationHTML;

    paginationContainerPets.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            currentPagePets = parseInt(button.dataset.page);
            const searchTerm = petSearch.value.toLowerCase();
            const filtered = searchTerm ? state.allPets.filter(pet => {
                const owner = state.allClients.find(c => c.id === pet.owner_id);
                const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.toLowerCase() : 'dueño desconocido';
                return pet.name.toLowerCase().includes(searchTerm) || ownerName.includes(searchTerm) || (pet.breed || '').toLowerCase().includes(searchTerm);
            }) : state.allPets;
            renderPets(filtered);
        });
    });
};

// ====== FUNCIÓN `renderPets` MODIFICADA ======
export const renderPets = (pets) => {
    if (!petsList) return;
    
    // Lógica de paginación
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
                <img src="${petImage}" 
                     alt="${pet.name}" 
                     class="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0">
                <div class="flex-1">
                    <h3 class="font-bold text-gray-800">${pet.name}</h3>
                    <p class="text-sm text-gray-600">${pet.breed || 'Raza no especificada'} | ${pet.sex || 'N/A'}</p>
                    <p class="text-xs text-gray-500">Dueño: ${ownerName}</p>
                </div>
            </button>
        `;
    }).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron mascotas.</p>`;

    // Renderizar la paginación
    renderPaginationPets(pets.length);
};


const showPetDetails = (petId) => {
    // ... (código sin cambios)
    updateState('currentPetId', petId);
    const pet = state.allPets.find(p => p.id === petId);
    if (!pet) return;
    
    const owner = state.allClients.find(c => c.id === pet.owner_id);
    const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}` : 'Dueño desconocido';
    
    const petAppointments = state.allAppointments
        .filter(app => app.pet_id === petId && app.status === 'completada')
        .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        
    const lastAppointment = petAppointments[0];

    let ageDisplay = 'N/A';
    if (pet.birth_date) {
        const birthDate = new Date(pet.birth_date);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        if (today.getMonth() < birthDate.getMonth() || 
            (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
            years--;
        }
        ageDisplay = `${years} año${years !== 1 ? 's' : ''}`;
    }
    
    const petImage = pet.image_url 
        ? pet.image_url 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name || 'M')}&background=10B981&color=FFFFFF`;
        
    const historyHTML = petAppointments.length > 0 
        ? petAppointments.map(app => `
            <div class="bg-gray-50 p-3 rounded-lg border-l-4 border-green-400">
                <p class="font-bold text-sm text-gray-800">${app.appointment_date} - ${app.appointment_time.slice(0, 5)}</p>
                <p class="text-xs text-gray-700 mt-1">Servicio: ${app.service || 'N/A'}</p>
                ${app.final_weight ? `<p class="text-xs text-gray-600">Peso: ${app.final_weight} kg</p>` : ''}
                ${app.final_observations ? `<p class="text-xs text-gray-600 truncate">Obs: ${app.final_observations}</p>` : ''}
            </div>
        `).join('')
        : '<p class="text-sm text-gray-500">No hay historial de servicios completados.</p>';

    
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

            <div class="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-200">
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
                            <p><strong>Pago:</strong> ${lastAppointment.payment_method || 'N/A'}</p>
                        </div>
                        ${lastAppointment.final_observations ? `<p class="text-xs text-gray-600 mt-2"><strong>Obs. Empleado:</strong> ${lastAppointment.final_observations}</p>` : ''}
                    </div>
                ` : '<p class="text-sm text-gray-500">No se encontró el último servicio completado.</p>'}
            </div>

            <div class="bg-white p-4 rounded-lg shadow-inner border border-gray-200">
                <h4 class="text-lg font-semibold text-gray-700 mb-3">Historial Completo (${petAppointments.length} servicios)</h4>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${historyHTML}
                </div>
            </div>
        </div>
    `;
    
    petsListView?.classList.add('hidden');
    petDetailsView?.classList.remove('hidden');
};

const showPetsList = () => {
    // ... (código sin cambios)
    petsListView?.classList.remove('hidden');
    petDetailsView?.classList.add('hidden');
    updateState('currentPetId', null);
};

const closePetModal = () => {
    // ... (código sin cambios)
    addPetModalEmployee?.classList.add('hidden');
    document.body.style.overflow = '';
    petFormEmployee?.reset();
    petFormMessageEmployee?.classList.add('hidden');
};

const handleAddPet = async (e) => {
    // ... (código sin cambios)
    e.preventDefault();
    
    if (!state.currentClientId) {
        alert('No hay un cliente seleccionado');
        return;
    }
    
    const formData = new FormData(petFormEmployee);
    const petData = {
        owner_id: state.currentClientId,
        name: formData.get('name'),
        breed: formData.get('breed'),
        size: formData.get('size'),
        weight: parseFloat(formData.get('weight')) || null,
        sex: formData.get('sex'),
        observations: formData.get('observations') || null
    };
    
    const result = await addPetFromDashboard(petData);
    
    if (result.success) {
        petFormMessageEmployee.textContent = '✅ Mascota registrada con éxito';
        petFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700';
        petFormMessageEmployee.classList.remove('hidden');
        
        const { data: pets } = await supabase.from('pets').select('*').order('created_at', { ascending: false });
        if (pets) {
            updateState('allPets', pets);
            renderPets(pets);
        }
        
        setTimeout(() => {
            closePetModal();
        }, 1500);
    } else {
        petFormMessageEmployee.textContent = `❌ ${result.error?.message || 'Error al registrar mascota'}`;
        petFormMessageEmployee.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        petFormMessageEmployee.classList.remove('hidden');
    }
};
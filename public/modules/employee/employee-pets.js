// public/modules/employee/employee-pets.js
// Módulo de gestión de mascotas

import { state, updateState } from './employee-state.js';
import { addPetFromDashboard } from '../dashboard/dashboard.api.js';
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let petSearch, petsList, petsListView, petDetailsView, petDetailsContent, backToPetsBtn;
let addPetModalEmployee, closeAddPetModalButtonEmployee, cancelAddPetButtonEmployee, petFormEmployee, petFormMessageEmployee;
// ELEMENTOS MODIFICADOS/NUEVOS
let clearPetSearchBtn;
let addPetToClientBtn; 

export const initPetElements = () => {
    petSearch = document.getElementById('pet-search');
    petsList = document.getElementById('pets-list');
    petsListView = document.getElementById('pets-list-view');
    petDetailsView = document.getElementById('pet-details-view');
    petDetailsContent = document.getElementById('pet-details-content');
    backToPetsBtn = document.getElementById('back-to-pets-btn');
    
    // Este botón se usa en employee-clients.js para el modal de añadir mascota
    addPetToClientBtn = document.querySelector('#add-pet-to-client-btn'); 
    
    addPetModalEmployee = document.querySelector('#add-pet-modal-employee');
    closeAddPetModalButtonEmployee = document.querySelector('#close-add-pet-modal-button-employee');
    cancelAddPetButtonEmployee = document.querySelector('#cancel-add-pet-button-employee');
    petFormEmployee = document.querySelector('#pet-form-employee');
    petFormMessageEmployee = document.querySelector('#pet-form-message-employee');

    // NUEVO
    clearPetSearchBtn = document.getElementById('clear-pet-search-btn');
};

export const setupPetListeners = () => {
    if (petSearch) {
        petSearch.addEventListener('input', handlePetSearch);
    }
    // Listener para el botón de limpiar búsqueda
    if (clearPetSearchBtn) {
        clearPetSearchBtn.addEventListener('click', () => {
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
    
    // Los listeners para el modal de agregar mascota se mantienen, asumiendo que se abrirá desde la vista de Clientes
    
    closeAddPetModalButtonEmployee?.addEventListener('click', closePetModal);
    cancelAddPetButtonEmployee?.addEventListener('click', closePetModal);
    petFormEmployee?.addEventListener('submit', handleAddPet);
};

const handlePetSearch = (e) => {
    const term = e.target.value.toLowerCase();
    
    // Muestra/Oculta el botón "X"
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

export const renderPets = (pets) => {
    if (!petsList) return;
    
    console.log('Renderizando mascotas:', pets.length); // DEBUG
    
    petsList.innerHTML = pets.length > 0 ? pets.map(pet => {
        const owner = state.allClients.find(c => c.id === pet.owner_id);
        const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}` : 'Dueño desconocido';
        
        // Lógica para la imagen real o placeholder con color verde
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
};

const showPetDetails = (petId) => {
    updateState('currentPetId', petId);
    const pet = state.allPets.find(p => p.id === petId);
    if (!pet) return;
    
    const owner = state.allClients.find(c => c.id === pet.owner_id);
    const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}` : 'Dueño desconocido';
    
    // Calcular edad desde birth_date si existe
    let ageDisplay = 'N/A';
    if (pet.birth_date) {
        const birthDate = new Date(pet.birth_date);
        const today = new Date();
        const ageInYears = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        ageDisplay = `${ageInYears} años`;
    }
    
    // Lógica para la imagen real o placeholder con color verde
    const petImage = pet.image_url 
        ? pet.image_url 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name || 'M')}&background=10B981&color=FFFFFF`;
    
    petDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <div class="flex items-center space-x-4 mb-4">
                <img src="${petImage}" 
                     alt="${pet.name}" 
                     class="w-20 h-20 rounded-full object-cover">
                <div>
                    <h3 class="font-bold text-2xl">${pet.name}</h3>
                    <p class="text-gray-600">${pet.breed || 'Raza no especificada'}</p>
                </div>
            </div>
            <div class="space-y-2">
                <p><strong>Tamaño:</strong> ${pet.size || 'N/A'}</p>
                <p><strong>Peso:</strong> ${pet.weight ? `${pet.weight} kg` : 'N/A'}</p>
                <p><strong>Edad:</strong> ${ageDisplay}</p>
                <p><strong>Sexo:</strong> ${pet.sex || 'N/A'}</p>
                <p><strong>Dueño:</strong> <a href="tel:${owner?.phone || ''}" class="text-blue-600">${ownerName}</a></p>
                ${pet.observations ? `<p><strong>Observaciones:</strong> ${pet.observations}</p>` : ''}
            </div>
        </div>
    `;
    
    petsListView?.classList.add('hidden');
    petDetailsView?.classList.remove('hidden');
};

const showPetsList = () => {
    petsListView?.classList.remove('hidden');
    petDetailsView?.classList.add('hidden');
    updateState('currentPetId', null);
};

const closePetModal = () => {
    addPetModalEmployee?.classList.add('hidden');
    document.body.style.overflow = '';
    petFormEmployee?.reset();
    petFormMessageEmployee?.classList.add('hidden');
};

const handleAddPet = async (e) => {
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
        
        // Recargar mascotas
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
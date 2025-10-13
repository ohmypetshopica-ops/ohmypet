import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const petsTableBody = document.querySelector('#pets-table-body');
const petSearchInput = document.querySelector('#pet-search-input');
const speciesFilter = document.querySelector('#species-filter');
const headerTitle = document.querySelector('#header-title');
const totalPetsCount = document.querySelector('#total-pets-count');
const dogsCount = document.querySelector('#dogs-count');
const catsCount = document.querySelector('#cats-count');
const appointmentsMonthCount = document.querySelector('#appointments-month-count');

// Modal
const petDetailsModal = document.querySelector('#pet-details-modal');
const closeModalBtn = document.querySelector('#close-modal-btn');
const closeModalBottomBtn = document.querySelector('#close-modal-bottom-btn');

// --- FUNCIÓN PARA CALCULAR EDAD ---
const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    if (years === 0) {
        return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    } else if (months === 0) {
        return `${years} ${years === 1 ? 'año' : 'años'}`;
    } else {
        return `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
};

// --- FUNCIONES DE API ---

const getAllPets = async () => {
    const { data, error } = await supabase
        .from('pets')
        .select(`
            id,
            name,
            species,
            breed,
            sex,
            size,
            birth_date,
            weight,
            observations,
            image_url,
            created_at,
            owner_id,
            profiles!pets_owner_id_fkey ( 
                id,
                full_name, 
                first_name, 
                last_name 
            )
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al obtener mascotas:', error);
        return [];
    }
    
    console.log(`✓ Se cargaron ${data?.length || 0} mascotas`);
    return data || [];
};

const searchPets = async (searchTerm) => {
    const allPets = await getAllPets();
    
    const searchLower = searchTerm.toLowerCase();
    return allPets.filter(pet => {
        const petName = pet.name?.toLowerCase() || '';
        const petBreed = pet.breed?.toLowerCase() || '';
        const ownerName = (
            pet.profiles?.full_name || 
            `${pet.profiles?.first_name} ${pet.profiles?.last_name}`
        ).toLowerCase();
        
        return petName.includes(searchLower) || 
               petBreed.includes(searchLower) || 
               ownerName.includes(searchLower);
    });
};

const getLastAppointment = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, status')
        .eq('pet_id', petId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        return null;
    }
    return data;
};

const getPetAppointments = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('pet_id', petId)
        .order('appointment_date', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error al obtener citas de la mascota:', error);
        return [];
    }
    return data || [];
};

const getStats = async () => {
    const { count: totalPets } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true });

    const { count: dogs } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .eq('species', 'Perro');

    const { count: cats } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .eq('species', 'Gato');

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const { count: appointmentsMonth } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', firstDay)
        .lte('appointment_date', lastDay);

    return {
        totalPets: totalPets || 0,
        dogs: dogs || 0,
        cats: cats || 0,
        appointmentsMonth: appointmentsMonth || 0
    };
};

// --- RENDERIZADO ---
const createPetRow = async (pet) => {
    const ownerProfile = pet.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin dueño asignado';

    const petData = JSON.stringify(pet).replace(/"/g, '&quot;');
    const ageDisplay = calculateAge(pet.birth_date) || 'N/A';

    // Obtener última cita
    const lastAppointment = await getLastAppointment(pet.id);
    let lastAppointmentDisplay = 'Sin citas';
    
    if (lastAppointment) {
        const date = new Date(lastAppointment.appointment_date);
        const formattedDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        lastAppointmentDisplay = `${formattedDate}`;
    }

    return `
        <tr class="hover:bg-gray-50 transition-colors" data-pet='${petData}'>
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <img class="h-10 w-10 rounded-full object-cover mr-3 border-2 border-gray-200" 
                         src="${pet.image_url || 'https://via.placeholder.com/40/10b981/ffffff?text=' + pet.name.charAt(0)}" 
                         alt="${pet.name}">
                    <div>
                        <div class="text-sm font-medium text-gray-900">${pet.name}</div>
                        <div class="text-sm text-gray-500">${pet.breed || 'Raza no especificada'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${ownerName}</div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    pet.species === 'Perro' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                }">
                    ${pet.species || 'N/A'}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">
                ${ageDisplay} • ${pet.size || 'N/A'}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
                ${lastAppointmentDisplay}
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
                <button class="text-green-600 hover:text-green-900 font-semibold view-details-btn">
                    Ver Detalles
                </button>
            </td>
        </tr>
    `;
};

const renderPetsTable = async (pets) => {
    if (pets.length > 0) {
        const rows = await Promise.all(pets.map(pet => createPetRow(pet)));
        petsTableBody.innerHTML = rows.join('');
    } else {
        petsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No se encontraron mascotas.</td></tr>';
    }
};

// --- MODAL ---
const openPetDetailsModal = async (pet) => {
    const ownerProfile = pet.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin dueño asignado';

    const ageDisplay = calculateAge(pet.birth_date) || 'N/A';

    document.querySelector('#modal-pet-image').src = pet.image_url || `https://via.placeholder.com/80/10b981/ffffff?text=${pet.name.charAt(0)}`;
    document.querySelector('#modal-pet-name').textContent = pet.name;
    document.querySelector('#modal-pet-breed').textContent = pet.breed || 'Raza no especificada';
    document.querySelector('#modal-pet-species').textContent = pet.species || 'N/A';
    document.querySelector('#modal-pet-sex').textContent = pet.sex || 'N/A';
    document.querySelector('#modal-pet-age').textContent = ageDisplay;
    document.querySelector('#modal-pet-weight').textContent = pet.weight ? `${pet.weight} kg` : 'N/A';
    document.querySelector('#modal-pet-size').textContent = pet.size || 'N/A';
    document.querySelector('#modal-pet-owner').textContent = ownerName;
    document.querySelector('#modal-pet-observations').textContent = pet.observations || 'Sin observaciones registradas.';

    const appointments = await getPetAppointments(pet.id);
    const appointmentsContainer = document.querySelector('#modal-pet-appointments');
    
    if (appointments.length > 0) {
        appointmentsContainer.innerHTML = appointments.map(apt => `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <div>
                    <p class="text-sm font-semibold text-gray-800">${apt.appointment_date} - ${apt.appointment_time}</p>
                    <p class="text-xs text-gray-600">${apt.service || 'Servicio general'}</p>
                </div>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                    apt.status === 'completada' ? 'bg-green-100 text-green-800' :
                    apt.status === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                    apt.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                }">
                    ${apt.status}
                </span>
            </div>
        `).join('');
    } else {
        appointmentsContainer.innerHTML = '<p class="text-sm text-gray-500">No hay citas registradas.</p>';
    }

    petDetailsModal.classList.remove('hidden');
};

const closePetDetailsModal = () => {
    petDetailsModal.classList.add('hidden');
};

// --- FILTROS Y BÚSQUEDA ---
const applyFilters = async () => {
    const searchTerm = petSearchInput.value.trim();
    const species = speciesFilter.value;

    petsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Buscando...</td></tr>';

    let pets = searchTerm ? await searchPets(searchTerm) : await getAllPets();

    if (species) {
        pets = pets.filter(pet => pet.species === species);
    }

    await renderPetsTable(pets);
};

// --- INICIALIZACIÓN ---
const initializePetsSection = async () => {
    if (headerTitle) headerTitle.textContent = 'Gestión de Mascotas';

    const stats = await getStats();
    if (totalPetsCount) totalPetsCount.textContent = stats.totalPets;
    if (dogsCount) dogsCount.textContent = stats.dogs;
    if (catsCount) catsCount.textContent = stats.cats;
    if (appointmentsMonthCount) appointmentsMonthCount.textContent = stats.appointmentsMonth;

    const allPets = await getAllPets();
    await renderPetsTable(allPets);

    if (petSearchInput) petSearchInput.addEventListener('input', applyFilters);
    if (speciesFilter) speciesFilter.addEventListener('change', applyFilters);

    if (closeModalBtn) closeModalBtn.addEventListener('click', closePetDetailsModal);
    if (closeModalBottomBtn) closeModalBottomBtn.addEventListener('click', closePetDetailsModal);

    if (petsTableBody) {
        petsTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-details-btn')) {
                const row = e.target.closest('tr');
                const petData = JSON.parse(row.dataset.pet);
                openPetDetailsModal(petData);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', initializePetsSection);
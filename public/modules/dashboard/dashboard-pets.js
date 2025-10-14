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
const paginationContainer = document.querySelector('#pagination-container');

// Modal
const petDetailsModal = document.querySelector('#pet-details-modal');
const closeModalBtn = document.querySelector('#close-modal-btn');
const closeModalBottomBtn = document.querySelector('#close-modal-bottom-btn');

// --- VARIABLES DE PAGINACIÓN ---
let currentPage = 1;
const itemsPerPage = 10;
let totalPets = 0;
let currentFilters = { search: '', species: '' };

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

// --- FUNCIONES DE API PAGINADAS ---
const getPetsPaginated = async (page = 1, search = '', species = '') => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
        .from('pets')
        .select(`
            id,
            name,
            species,
            breed,
            birth_date,
            size,
            profiles!pets_owner_id_fkey (
                first_name,
                last_name,
                full_name
            )
        `, { count: 'exact' });

    if (search) {
        query = query.or(`name.ilike.%${search}%,breed.ilike.%${search}%,profiles.first_name.ilike.%${search}%,profiles.last_name.ilike.%${search}%,profiles.full_name.ilike.%${search}%`);
    }

    if (species) {
        query = query.eq('species', species);
    }

    const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(from, to);

    if (error) {
        console.error('Error al obtener mascotas paginadas:', error);
        return { pets: [], total: 0 };
    }

    return { pets: data || [], total: count || 0 };
};

const getLastAppointment = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('pet_id', petId)
        .order('appointment_date', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error al obtener última cita:', error);
        return null;
    }

    return data;
};

const getPetDetails = async (petId) => {
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
            profiles!pets_owner_id_fkey (
                first_name,
                last_name,
                full_name
            )
        `)
        .eq('id', petId)
        .single();

    if (error) {
        console.error('Error al obtener detalles de mascota:', error);
        return null;
    }

    return data;
};

const getStats = async () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [totalPetsRes, dogsRes, catsRes, appointmentsRes] = await Promise.all([
        supabase.from('pets').select('*', { count: 'exact', head: true }),
        supabase.from('pets').select('*', { count: 'exact', head: true }).eq('species', 'Perro'),
        supabase.from('pets').select('*', { count: 'exact', head: true }).eq('species', 'Gato'),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
            .gte('appointment_date', firstDayOfMonth)
            .lte('appointment_date', lastDayOfMonth)
    ]);

    return {
        totalPets: totalPetsRes.count || 0,
        dogs: dogsRes.count || 0,
        cats: catsRes.count || 0,
        appointmentsMonth: appointmentsRes.count || 0
    };
};

// --- RENDERIZADO DE TABLA ---
const createPetRow = async (pet) => {
    const ownerProfile = pet.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin dueño asignado';

    const ageDisplay = calculateAge(pet.birth_date) || 'N/A';

    const lastAppointment = await getLastAppointment(pet.id);
    let lastAppointmentDisplay = 'Sin citas';
    
    if (lastAppointment) {
        const date = new Date(lastAppointment.appointment_date);
        const formattedDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        lastAppointmentDisplay = formattedDate;
    }

    return `
        <tr class="hover:bg-gray-50 transition-colors" data-pet-id="${pet.id}">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold mr-3">
                        ${pet.name.charAt(0).toUpperCase()}
                    </div>
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

// --- PAGINACIÓN ---
const renderPagination = () => {
    const totalPages = Math.ceil(totalPets / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4">';

    if (currentPage > 1) {
        paginationHTML += `<button class="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100" data-page="${currentPage - 1}">Anterior</button>`;
    }

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'bg-green-600 text-white' : 'border border-gray-300 hover:bg-gray-100';
        paginationHTML += `<button class="px-3 py-1 rounded-lg ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100" data-page="${currentPage + 1}">Siguiente</button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async () => {
            currentPage = parseInt(btn.dataset.page);
            await loadPets();
        });
    });
};

// --- CARGA DE MASCOTAS ---
const loadPets = async () => {
    petsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Cargando mascotas...</td></tr>';
    
    const { pets, total } = await getPetsPaginated(currentPage, currentFilters.search, currentFilters.species);
    totalPets = total;
    
    await renderPetsTable(pets);
    renderPagination();
};

// --- FILTROS ---
const applyFilters = async () => {
    currentFilters.search = petSearchInput?.value.trim() || '';
    currentFilters.species = speciesFilter?.value || '';
    currentPage = 1;
    await loadPets();
};

// --- MODAL ---
const openPetDetailsModal = async (petId) => {
    const pet = await getPetDetails(petId);
    if (!pet) return;

    const ownerProfile = pet.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin dueño asignado';

    document.querySelector('#modal-pet-name').textContent = pet.name;
    document.querySelector('#modal-pet-breed').textContent = pet.breed || 'Raza no especificada';
    document.querySelector('#modal-pet-species').textContent = pet.species || 'N/A';
    document.querySelector('#modal-pet-sex').textContent = pet.sex || 'N/A';
    document.querySelector('#modal-pet-age').textContent = calculateAge(pet.birth_date) || 'N/A';
    document.querySelector('#modal-pet-weight').textContent = pet.weight ? `${pet.weight} kg` : 'N/A';
    document.querySelector('#modal-pet-size').textContent = pet.size || 'N/A';
    document.querySelector('#modal-pet-owner').textContent = ownerName;
    document.querySelector('#modal-pet-observations').textContent = pet.observations || 'Sin observaciones';

    const modalImage = document.querySelector('#modal-pet-image');
    if (pet.image_url) {
        modalImage.src = pet.image_url;
    } else {
        modalImage.src = `https://via.placeholder.com/80/10b981/ffffff?text=${pet.name.charAt(0)}`;
    }

    petDetailsModal.classList.remove('hidden');
};

const closePetDetailsModal = () => {
    petDetailsModal.classList.add('hidden');
};

// --- INICIALIZACIÓN ---
const initializePetsSection = async () => {
    if (headerTitle) headerTitle.textContent = 'Gestión de Mascotas';

    const stats = await getStats();
    if (totalPetsCount) totalPetsCount.textContent = stats.totalPets;
    if (dogsCount) dogsCount.textContent = stats.dogs;
    if (catsCount) catsCount.textContent = stats.cats;
    if (appointmentsMonthCount) appointmentsMonthCount.textContent = stats.appointmentsMonth;

    await loadPets();

    if (petSearchInput) petSearchInput.addEventListener('input', applyFilters);
    if (speciesFilter) speciesFilter.addEventListener('change', applyFilters);

    if (closeModalBtn) closeModalBtn.addEventListener('click', closePetDetailsModal);
    if (closeModalBottomBtn) closeModalBottomBtn.addEventListener('click', closePetDetailsModal);

    if (petsTableBody) {
        petsTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('view-details-btn')) {
                const row = e.target.closest('tr');
                const petId = row.dataset.petId;
                await openPetDetailsModal(petId);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', initializePetsSection);
import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
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

// Modal
const petDetailsModal = document.querySelector('#pet-details-modal');
const closeModalBtn = document.querySelector('#close-modal-btn');
const closeModalBottomBtn = document.querySelector('#close-modal-bottom-btn');

// --- VARIABLES DE PAGINACIÓN ---
let currentPage = 1;
const itemsPerPage = 10;
let totalPets = 0;
let currentSearch = '';
let selectedBreeds = [];
let allBreeds = [];

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
const getAllBreeds = async () => {
    const { data, error } = await supabase
        .from('pets')
        .select('breed')
        .not('breed', 'is', null);

    if (error) {
        console.error('Error al obtener razas:', error);
        return [];
    }

    const breeds = [...new Set(data.map(p => p.breed).filter(b => b && b.trim()))].sort();
    return breeds;
};

const getPetsPaginated = async (page = 1, search = '', breeds = []) => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
        .from('pets')
        .select(`
            id,
            name,
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

    if (breeds.length > 0) {
        query = query.in('breed', breeds);
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

const getPetAppointments = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, service, status')
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
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [totalPetsRes, dogsRes, appointmentsRes] = await Promise.all([
        supabase.from('pets').select('*', { count: 'exact', head: true }),
        supabase.from('pets').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
            .gte('appointment_date', firstDayOfMonth)
            .lte('appointment_date', lastDayOfMonth)
    ]);

    return {
        totalPets: totalPetsRes.count || 0,
        dogs: dogsRes.count || 0,
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
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${ownerName}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700">${pet.breed || 'No especificada'}</div>
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

    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4 mb-4">';

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
    
    const { pets, total } = await getPetsPaginated(currentPage, currentSearch, selectedBreeds);
    totalPets = total;
    
    await renderPetsTable(pets);
    renderPagination();
};

// --- FILTROS DE RAZA ---
const renderBreedOptions = async () => {
    allBreeds = await getAllBreeds();
    
    breedOptionsList.innerHTML = allBreeds.map(breed => `
        <label class="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" value="${breed}" class="breed-checkbox mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded">
            <span class="text-sm text-gray-700">${breed}</span>
        </label>
    `).join('');

    setupBreedCheckboxes();
};

const setupBreedCheckboxes = () => {
    const checkboxes = document.querySelectorAll('.breed-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const value = e.target.value;
            
            if (value === 'all') {
                if (e.target.checked) {
                    selectedBreeds = [];
                    checkboxes.forEach(cb => {
                        if (cb.value !== 'all') cb.checked = false;
                    });
                }
            } else {
                const allCheckbox = document.querySelector('.breed-checkbox[value="all"]');
                if (allCheckbox) allCheckbox.checked = false;
                
                if (e.target.checked) {
                    selectedBreeds.push(value);
                } else {
                    selectedBreeds = selectedBreeds.filter(b => b !== value);
                }

                if (selectedBreeds.length === 0) {
                    if (allCheckbox) allCheckbox.checked = true;
                }
            }

            updateBreedFilterDisplay();
            applyFilters();
        });
    });
};

const updateBreedFilterDisplay = () => {
    if (selectedBreeds.length === 0) {
        breedFilterText.textContent = 'Todas las razas';
        selectedBreedsTags.innerHTML = '';
    } else {
        breedFilterText.textContent = `${selectedBreeds.length} raza${selectedBreeds.length > 1 ? 's' : ''} seleccionada${selectedBreeds.length > 1 ? 's' : ''}`;
        
        selectedBreedsTags.innerHTML = selectedBreeds.map(breed => `
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ${breed}
                <button type="button" class="ml-2 text-green-600 hover:text-green-800" data-breed="${breed}">
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </span>
        `).join('');

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

// --- FILTROS ---
const applyFilters = async () => {
    currentSearch = petSearchInput?.value.trim() || '';
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
    document.querySelector('#modal-pet-breed-detail').textContent = pet.breed || 'No especificada';
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
        modalImage.src = `https://ui-avatars.com/api/?name=${pet.name}&background=10b981&color=fff&size=80`;
    }

    const appointments = await getPetAppointments(pet.id);
    const appointmentsContainer = document.querySelector('#modal-pet-appointments');
    
    if (appointments.length > 0) {
        const lastAppointment = appointments[0];
        appointmentsContainer.innerHTML = `
            <div class="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200">
                <div>
                    <p class="text-sm font-semibold text-gray-800">${new Date(lastAppointment.appointment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${lastAppointment.appointment_time}</p>
                    <p class="text-xs text-gray-600">${lastAppointment.service || 'Servicio general'}</p>
                </div>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${
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
            window.location.href = `/public/modules/dashboard/dashboard-appointments.html?pet=${pet.id}`;
        };
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
    if (appointmentsMonthCount) appointmentsMonthCount.textContent = stats.appointmentsMonth;

    await renderBreedOptions();
    await loadPets();

    if (petSearchInput) petSearchInput.addEventListener('input', applyFilters);

    if (breedFilterBtn) {
        breedFilterBtn.addEventListener('click', toggleBreedDropdown);
    }

    document.addEventListener('click', (e) => {
        if (!breedFilterBtn.contains(e.target) && !breedFilterDropdown.contains(e.target)) {
            breedFilterDropdown.classList.add('hidden');
        }
    });

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
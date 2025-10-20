// public/modules/employee/dashboard.js

import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const headerTitle = document.getElementById('header-title');
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');
const clientsList = document.getElementById('clients-list');
const clientSearch = document.getElementById('client-search');
const petsList = document.getElementById('pets-list');
const petSearch = document.getElementById('pet-search');
const logoutButton = document.getElementById('logout-button');

// --- ELEMENTOS DEL CALENDARIO ---
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

// --- ELEMENTOS DEL MODAL ---
const calendarModal = document.getElementById('calendar-modal');
const modalContent = document.getElementById('modal-content');
const modalDateTitle = document.getElementById('modal-date-title');
const modalDailyView = document.getElementById('modal-daily-view');
const modalAppointmentsList = document.getElementById('modal-appointments-list');
const modalPetDetailsView = document.getElementById('modal-pet-details-view');
const modalPetDetailsContent = document.getElementById('modal-pet-details-content');
const modalBackBtn = document.getElementById('modal-back-btn');

// --- ESTADO DE LA APLICACIÓN ---
let allClients = [];
let allPets = [];
let allAppointments = [];
let currentDate = new Date();

// --- LÓGICA DE NAVEGACIÓN Y VISTAS ---
const showView = (viewId) => {
    views.forEach(view => view.classList.add('hidden'));
    document.getElementById(`${viewId}-view`).classList.remove('hidden');

    navButtons.forEach(btn => {
        const isActive = btn.dataset.view === viewId;
        btn.classList.toggle('text-green-600', isActive);
        btn.classList.toggle('border-t-2', isActive);
        btn.classList.toggle('border-green-600', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
        if (isActive) {
            headerTitle.textContent = btn.querySelector('span').textContent;
        }
    });
};

/*
================================================================
CORRECCIÓN: Las funciones 'renderClients' y 'renderPets' se definen 
completamente aquí una sola vez, en lugar de ser reasignadas más abajo.
Esto soluciona el error "Assignment to constant variable".
================================================================
*/
const renderClients = (clients) => {
    clientsList.innerHTML = clients.length > 0 ? clients.map(client => `
        <div class="bg-white p-4 rounded-lg shadow-sm border">
            <h3 class="font-bold text-gray-800">${client.first_name || ''} ${client.last_name || ''}</h3>
            <p class="text-sm text-gray-600">${client.phone || 'Sin teléfono'}</p>
            <p class="text-sm text-gray-500">${client.email || 'Sin email'}</p>
        </div>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron clientes.</p>`;
};

const renderPets = (pets) => {
    petsList.innerHTML = pets.length > 0 ? pets.map(pet => `
        <div class="bg-white p-4 rounded-lg shadow-sm border flex items-center gap-4">
            <img src="${pet.image_url || `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${pet.name.charAt(0)}`}" class="h-12 w-12 rounded-full object-cover">
            <div>
                <h3 class="font-bold text-gray-800">${pet.name}</h3>
                <p class="text-sm text-gray-600">${pet.breed}</p>
                <p class="text-xs text-gray-500">Dueño: ${pet.profiles.first_name || ''} ${pet.profiles.last_name || ''}</p>
            </div>
        </div>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron mascotas.</p>`;
};


// --- LÓGICA DEL MODAL ---
const openModal = () => {
    calendarModal.classList.remove('hidden');
    setTimeout(() => {
        modalContent.classList.remove('translate-y-full');
    }, 10);
};

const closeModal = () => {
    modalContent.classList.add('translate-y-full');
    setTimeout(() => {
        calendarModal.classList.add('hidden');
    }, 300);
};

// --- LÓGICA DEL CALENDARIO Y CITAS ---
const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;
    calendarGrid.innerHTML = '';
    ['D', 'L', 'M', 'M', 'J', 'V', 'S'].forEach(day => { calendarGrid.innerHTML += `<div class="font-semibold text-gray-400 text-xs">${day}</div>`; });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) calendarGrid.innerHTML += `<div></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasAppointments = allAppointments.some(app => app.appointment_date === dateStr);
        const dayClass = hasAppointments ? 'bg-green-100 text-green-700 font-bold' : '';
        const todayClass = new Date().toDateString() === new Date(year, month, day).toDateString() ? 'ring-2 ring-blue-500' : '';
        calendarGrid.innerHTML += `<div data-date="${dateStr}" data-has-appointments="${hasAppointments}" class="day-cell cursor-pointer p-2 rounded-full ${todayClass} ${dayClass}">${day}</div>`;
    }
};

const renderAppointmentsInModal = (date) => {
    const appointmentsOnDay = allAppointments.filter(app => app.appointment_date === date).sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));
    modalDateTitle.textContent = `Citas del ${date}`;
    if (appointmentsOnDay.length === 0) {
        modalAppointmentsList.innerHTML = `<p class="text-center text-gray-500">No hay citas para este día.</p>`;
    } else {
        modalAppointmentsList.innerHTML = appointmentsOnDay.map(app => `
            <button data-pet-id="${app.pets.id}" class="appointment-btn w-full text-left bg-white p-3 rounded-lg shadow-sm border hover:bg-gray-50">
                <p class="font-semibold">${app.appointment_time.slice(0, 5)} - ${app.pets.name}</p>
                <p class="text-sm text-gray-600">Dueño: ${app.profiles.first_name || ''} ${app.profiles.last_name || ''}</p>
                <p class="text-xs text-gray-500">${app.service}</p>
            </button>
        `).join('');
    }
};

const renderPetDetailsInModal = (petId) => {
    const pet = allPets.find(p => p.id === petId);
    if (!pet) {
        modalPetDetailsContent.innerHTML = `<p>Error: No se encontraron los datos de la mascota.</p>`;
    } else {
        const calculateAge = (birthDate) => {
            if (!birthDate) return 'N/A';
            const birth = new Date(birthDate);
            const today = new Date();
            let years = today.getFullYear() - birth.getFullYear();
            let months = today.getMonth() - birth.getMonth();
            if (months < 0) { years--; months += 12; }
            return `${years} años y ${months} meses`;
        };
        modalPetDetailsContent.innerHTML = `
            <div class="text-center">
                <img src="${pet.image_url || `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${pet.name.charAt(0)}`}" class="h-24 w-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg">
                <h3 class="text-2xl font-bold mt-2">${pet.name}</h3>
                <p class="text-gray-600">${pet.breed}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="bg-white p-3 rounded-lg shadow-sm"><strong>Dueño:</strong> ${pet.profiles.first_name || ''} ${pet.profiles.last_name || ''}</div>
                <div class="bg-white p-3 rounded-lg shadow-sm"><strong>Sexo:</strong> ${pet.sex || 'N/A'}</div>
                <div class="bg-white p-3 rounded-lg shadow-sm"><strong>Edad:</strong> ${calculateAge(pet.birth_date)}</div>
                <div class="bg-white p-3 rounded-lg shadow-sm"><strong>Peso:</strong> ${pet.weight ? pet.weight + ' kg' : 'N/A'}</div>
            </div>
            <div class="bg-yellow-50 p-3 rounded-lg shadow-sm">
                <strong class="text-sm">Observaciones:</strong>
                <p class="text-sm mt-1">${pet.observations || 'Sin observaciones.'}</p>
            </div>
        `;
    }
};

// --- CARGA INICIAL DE DATOS ---
const loadInitialData = async () => {
    const [clientsRes, petsRes, appointmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cliente'),
        supabase.from('pets').select('*, profiles(first_name, last_name)'),
        supabase.from('appointments').select('*, pets(*), profiles(first_name, last_name)')
    ]);
    
    allClients = clientsRes.data || [];
    allPets = petsRes.data || [];
    allAppointments = appointmentsRes.data || [];

    renderClients(allClients);
    renderPets(allPets);
    renderCalendar();
};

// --- INICIALIZACIÓN Y EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Listeners de navegación
    navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    logoutButton.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/public/modules/login/login.html'; });
    
    // Listeners de búsqueda
    clientSearch.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); renderClients(allClients.filter(c => `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term))); });
    petSearch.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); renderPets(allPets.filter(p => p.name.toLowerCase().includes(term) || `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.toLowerCase().includes(term))); });

    // Listeners de calendario
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    calendarGrid.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.day-cell');
        if (dayCell && dayCell.dataset.hasAppointments === 'true') {
            renderAppointmentsInModal(dayCell.dataset.date);
            modalDailyView.classList.remove('hidden');
            modalPetDetailsView.classList.add('hidden');
            openModal();
        }
    });

    // Listeners del Modal
    calendarModal.addEventListener('click', (e) => { if (e.target === calendarModal) closeModal(); });
    modalAppointmentsList.addEventListener('click', (e) => {
        const appointmentButton = e.target.closest('.appointment-btn');
        if (appointmentButton) {
            renderPetDetailsInModal(appointmentButton.dataset.petId);
            modalDailyView.classList.add('hidden');
            modalPetDetailsView.classList.remove('hidden');
        }
    });
    modalBackBtn.addEventListener('click', () => {
        modalPetDetailsView.classList.add('hidden');
        modalDailyView.classList.remove('hidden');
    });

    // Carga inicial
    showView('clients');
    loadInitialData();
});
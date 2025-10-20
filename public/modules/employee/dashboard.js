// public/modules/employee/dashboard.js

import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const headerTitle = document.getElementById('header-title');
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');
const logoutButton = document.getElementById('logout-button');
const clientSearch = document.getElementById('client-search');
const clientsListView = document.getElementById('clients-list-view');
const clientsList = document.getElementById('clients-list');
const clientDetailsView = document.getElementById('client-details-view');
const clientDetailsContent = document.getElementById('client-details-content');
const backToClientsBtn = document.getElementById('back-to-clients-btn');
const petSearch = document.getElementById('pet-search');
const petsListView = document.getElementById('pets-list-view');
const petsList = document.getElementById('pets-list');
const petDetailsView = document.getElementById('pet-details-view');
const petDetailsContent = document.getElementById('pet-details-content');
const backToPetsBtn = document.getElementById('back-to-pets-btn');
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const calendarModal = document.getElementById('calendar-modal');
const modalContent = document.getElementById('modal-content');
const modalDateTitle = document.getElementById('modal-date-title');
const modalDailyView = document.getElementById('modal-daily-view');
const modalAppointmentsList = document.getElementById('modal-appointments-list');
const modalDetailsView = document.getElementById('modal-details-view');
const modalDetailsContent = document.getElementById('modal-details-content');
const modalBackBtn = document.getElementById('modal-back-btn');

// --- ESTADO DE LA APLICACIÓN ---
let allClients = [];
let allPets = [];
let monthlyAppointments = [];
let allAppointments = [];
let currentDate = new Date();

// --- FUNCIONES AUXILIARES ---
const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) {
        years--;
        months += 12;
    }
    return `${years} años y ${months} meses`;
};

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
        if (isActive) headerTitle.textContent = btn.querySelector('span').textContent;
    });
};

// --- SECCIÓN DE CLIENTES ---
const renderClients = (clients) => {
    clientsList.innerHTML = clients.length > 0 ? clients.map(client => `
        <button data-client-id="${client.id}" class="client-btn w-full text-left bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50">
            <h3 class="font-bold text-gray-800">${client.first_name || ''} ${client.last_name || ''}</h3>
            <p class="text-sm text-gray-600">${client.phone || 'Sin teléfono'}</p>
            <p class="text-sm text-gray-500">${client.email || 'Sin email'}</p>
        </button>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron clientes.</p>`;
};
const showClientDetails = (clientId) => {
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;
    const clientPets = allPets.filter(pet => pet.owner_id === clientId);
    clientDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h3 class="font-bold text-xl mb-2">${client.first_name || ''} ${client.last_name || ''}</h3>
            <p><strong>Teléfono:</strong> <a href="tel:${client.phone}" class="text-blue-600">${client.phone || 'N/A'}</a></p>
            <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
            <p><strong>Distrito:</strong> ${client.district || 'N/A'}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Mascotas (${clientPets.length})</h4>
            <div class="space-y-3">
                ${clientPets.length > 0 ? clientPets.map(pet => `
                    <div class="bg-gray-50 p-3 rounded-lg flex items-center gap-4">
                        <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-12 w-12 rounded-full object-cover">
                        <div>
                            <p class="font-semibold">${pet.name}</p>
                            <p class="text-sm text-gray-600">${pet.breed}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">Este cliente no tiene mascotas registradas.</p>'}
            </div>
        </div>
    `;
    clientsListView.classList.add('hidden');
    clientDetailsView.classList.remove('hidden');
};
const showClientsListView = () => {
    clientDetailsView.classList.add('hidden');
    clientsListView.classList.remove('hidden');
};

// --- SECCIÓN DE MASCOTAS ---
const renderPets = (pets) => {
    petsList.innerHTML = pets.length > 0 ? pets.map(pet => `
        <button data-pet-id="${pet.id}" class="pet-btn w-full text-left bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50 flex items-center gap-4">
            <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-12 w-12 rounded-full object-cover">
            <div>
                <h3 class="font-bold text-gray-800">${pet.name}</h3>
                <p class="text-sm text-gray-600">${pet.breed}</p>
                <p class="text-xs text-gray-500">Dueño: ${pet.profiles.first_name || ''} ${pet.profiles.last_name || ''}</p>
            </div>
        </button>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron mascotas.</p>`;
};
const showPetDetails = (petId) => {
    const pet = allPets.find(p => p.id === petId);
    if (!pet) return;
    const petHistory = allAppointments.filter(app => app.pet_id === petId).sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
    petDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm text-center">
            <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-24 w-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg">
            <h3 class="text-2xl font-bold mt-2">${pet.name}</h3>
            <p class="text-gray-600">${pet.breed}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Información de la Mascota</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <p><strong>Dueño:</strong> ${pet.profiles.first_name || ''} ${pet.profiles.last_name || ''}</p>
                <p><strong>Sexo:</strong> ${pet.sex || 'N/A'}</p>
                <p><strong>Edad:</strong> ${calculateAge(pet.birth_date)}</p>
                <p><strong>Peso:</strong> ${pet.weight ? pet.weight + ' kg' : 'N/A'}</p>
            </div>
            <div class="bg-yellow-50 p-2 rounded-md mt-2">
                <p class="text-xs font-semibold">Observaciones Generales:</p>
                <p class="text-xs">${pet.observations || 'Sin observaciones.'}</p>
            </div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Historial Completo</h4>
            <div class="space-y-2 max-h-48 overflow-y-auto">
                ${petHistory.length > 0 ? petHistory.map(hist => `
                    <div class="bg-gray-50 p-2 rounded-md text-sm flex justify-between items-center">
                        <p><strong>${hist.appointment_date}:</strong> ${hist.service}</p>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${hist.status === 'completada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${hist.status}</span>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No tiene historial de citas.</p>'}
            </div>
        </div>
    `;
    petsListView.classList.add('hidden');
    petDetailsView.classList.remove('hidden');
};
const showPetsListView = () => {
    petDetailsView.classList.add('hidden');
    petsListView.classList.remove('hidden');
};

// --- LÓGICA DEL MODAL DE CALENDARIO ---
const openModal = () => { calendarModal.classList.remove('hidden'); setTimeout(() => modalContent.classList.remove('translate-y-full'), 10); };
const closeModal = () => { modalContent.classList.add('translate-y-full'); setTimeout(() => calendarModal.classList.add('hidden'), 300); };

// --- SECCIÓN DE CALENDARIO ---
const fetchAppointmentsForMonth = async (date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0]; const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const { data, error } = await supabase.from('appointments').select('*, pets(*), profiles(first_name, last_name)').gte('appointment_date', firstDay).lte('appointment_date', lastDay);
    if (error) { console.error("Error cargando citas del mes:", error); monthlyAppointments = []; } else { monthlyAppointments = data || []; }
};

const renderCalendar = async () => {
    await fetchAppointmentsForMonth(currentDate);
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`; calendarGrid.innerHTML = '';
    ['D', 'L', 'M', 'M', 'J', 'V', 'S'].forEach(day => { calendarGrid.innerHTML += `<div class="font-semibold text-gray-400 text-xs">${day}</div>`; });
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) calendarGrid.innerHTML += `<div></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasAppointments = monthlyAppointments.some(app => app.appointment_date === dateStr);
        const dayClass = hasAppointments ? 'bg-green-100 text-green-700 font-bold' : '';
        const todayClass = new Date().toDateString() === new Date(year, month, day).toDateString() ? 'ring-2 ring-blue-500' : '';
        calendarGrid.innerHTML += `<div data-date="${dateStr}" data-has-appointments="${hasAppointments}" class="day-cell cursor-pointer p-2 rounded-full ${todayClass} ${dayClass}">${day}</div>`;
    }
};

const renderAppointmentsInModal = (date) => {
    const appointmentsOnDay = monthlyAppointments.filter(app => app.appointment_date === date).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    modalDateTitle.textContent = `Citas del ${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    modalAppointmentsList.innerHTML = appointmentsOnDay.length > 0 ? appointmentsOnDay.map(app => `
        <button data-appointment-id="${app.id}" class="appointment-btn w-full text-left bg-white p-3 rounded-lg shadow-sm border hover:bg-gray-50 flex items-center gap-4">
            <img src="${app.pets.image_url || `https://ui-avatars.com/api/?name=${app.pets.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-12 w-12 rounded-full object-cover flex-shrink-0">
            <div>
                <p class="font-semibold">${app.appointment_time.slice(0, 5)} - ${app.pets.name}</p>
                <p class="text-sm text-gray-600">Dueño: ${app.profiles.first_name || ''} ${app.profiles.last_name || ''}</p>
                <p class="text-xs text-gray-500">${app.service}</p>
            </div>
        </button>
    `).join('') : `<p class="text-center text-gray-500">No hay citas para este día.</p>`;
};

const showAppointmentDetails = async (appointmentId) => {
    const appointment = monthlyAppointments.find(app => app.id === appointmentId);
    if (!appointment) return;

    const pet = appointment.pets;
    
    // CORRECCIÓN: La consulta para el historial debe traer también 'final_observations'
    const { data: petHistory, error } = await supabase
        .from('appointments')
        .select('appointment_date, service, status, final_observations')
        .eq('pet_id', pet.id)
        .neq('id', appointment.id)
        .order('appointment_date', { ascending: false });

    if (error) console.error("Error cargando historial completo de la mascota:", error);

    // NUEVO: Lógica para obtener las notas de la última cita
    let lastAppointmentNotes = 'No hay observaciones de citas anteriores.';
    if (petHistory && petHistory.length > 0) {
        lastAppointmentNotes = petHistory[0].final_observations || 'La cita anterior no tuvo observaciones.';
    }

    modalDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Cita Actual</h4>
            <div class="flex items-center gap-4">
                <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-16 w-16 rounded-full object-cover">
                <div>
                    <p><strong>Hora:</strong> ${appointment.appointment_time.slice(0, 5)}</p>
                    <p><strong>Mascota:</strong> ${pet.name}</p>
                    <p><strong>Servicio:</strong> ${appointment.service}</p>
                </div>
            </div>
        </div>
        
        <div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-lg shadow-sm">
            <h4 class="font-semibold text-sm text-blue-800 mb-1">Observaciones de la Última Cita</h4>
            <p class="text-sm text-gray-700">${lastAppointmentNotes}</p>
        </div>

        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Información de la Mascota</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <p><strong>Raza:</strong> ${pet.breed}</p>
                <p><strong>Sexo:</strong> ${pet.sex || 'N/A'}</p>
                <p><strong>Edad:</strong> ${calculateAge(pet.birth_date)}</p>
                <p><strong>Peso:</strong> ${pet.weight ? pet.weight + ' kg' : 'N/A'}</p>
            </div>
            <div class="bg-yellow-50 p-2 rounded-md mt-2">
                <p class="text-xs font-semibold">Observaciones Generales:</p>
                <p class="text-xs">${pet.observations || 'Sin observaciones.'}</p>
            </div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Historial Completo</h4>
            <div class="space-y-2 max-h-40 overflow-y-auto">
                ${petHistory && petHistory.length > 0 ? petHistory.map(hist => `
                    <div class="bg-gray-50 p-2 rounded-md text-sm flex justify-between items-center">
                        <p><strong>${hist.appointment_date}:</strong> ${hist.service}</p>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${hist.status === 'completada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${hist.status}</span>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No hay historial de citas anteriores.</p>'}
            </div>
        </div>
    `;
    modalDailyView.classList.add('hidden');
    modalDetailsView.classList.remove('hidden');
};

// --- CARGA INICIAL DE DATOS ---
const loadInitialData = async () => {
    const [clientsRes, petsRes, appointmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cliente'),
        supabase.from('pets').select('*, profiles(*)'),
        supabase.from('appointments').select('*, pets(*), profiles(*)')
    ]);
    allClients = clientsRes.data || [];
    allPets = petsRes.data || [];
    allAppointments = appointmentsRes.data || [];
    renderClients(allClients);
    renderPets(allPets);
    await renderCalendar();
};

// --- INICIALIZACIÓN Y EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    logoutButton.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/public/modules/login/login.html'; });
    clientSearch.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); renderClients(allClients.filter(c => `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term))); });
    clientsList.addEventListener('click', (e) => { const btn = e.target.closest('.client-btn'); if (btn) showClientDetails(btn.dataset.clientId); });
    backToClientsBtn.addEventListener('click', showClientsListView);
    petSearch.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); renderPets(allPets.filter(p => p.name.toLowerCase().includes(term) || `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.toLowerCase().includes(term))); });
    petsList.addEventListener('click', (e) => { const btn = e.target.closest('.pet-btn'); if (btn) showPetDetails(btn.dataset.petId); });
    backToPetsBtn.addEventListener('click', showPetsListView);
    prevMonthBtn.addEventListener('click', async () => { currentDate.setMonth(currentDate.getMonth() - 1); await renderCalendar(); });
    nextMonthBtn.addEventListener('click', async () => { currentDate.setMonth(currentDate.getMonth() + 1); await renderCalendar(); });
    calendarGrid.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.day-cell');
        if (dayCell && dayCell.dataset.hasAppointments === 'true') {
            renderAppointmentsInModal(dayCell.dataset.date);
            modalDailyView.classList.remove('hidden');
            modalDetailsView.classList.add('hidden');
            openModal();
        }
    });
    calendarModal.addEventListener('click', (e) => { if (e.target === calendarModal) closeModal(); });
    modalAppointmentsList.addEventListener('click', (e) => { const btn = e.target.closest('.appointment-btn'); if (btn) showAppointmentDetails(btn.dataset.appointmentId); });
    modalBackBtn.addEventListener('click', () => { modalDetailsView.classList.add('hidden'); modalDailyView.classList.remove('hidden'); });
    showView('clients');
    loadInitialData();
});
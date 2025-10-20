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
        if (isActive) headerTitle.textContent = btn.querySelector('span').textContent;
    });
};

// --- RENDERIZADO DE CLIENTES Y MASCOTAS ---
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
            <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-12 w-12 rounded-full object-cover">
            <div>
                <h3 class="font-bold text-gray-800">${pet.name}</h3>
                <p class="text-sm text-gray-600">${pet.breed}</p>
                <p class="text-xs text-gray-500">Dueño: ${pet.profiles.first_name || ''} ${pet.profiles.last_name || ''}</p>
            </div>
        </div>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron mascotas.</p>`;
};

// --- LÓGICA DEL MODAL ---
const openModal = () => { calendarModal.classList.remove('hidden'); setTimeout(() => modalContent.classList.remove('translate-y-full'), 10); };
const closeModal = () => { modalContent.classList.add('translate-y-full'); setTimeout(() => calendarModal.classList.add('hidden'), 300); };

// --- LÓGICA DEL CALENDARIO Y CITAS ---
const fetchAppointmentsForMonth = async (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('appointments')
        .select('*, pets(*), profiles(first_name, last_name)')
        .gte('appointment_date', firstDay)
        .lte('appointment_date', lastDay);

    if (error) {
        console.error("Error cargando citas del mes:", error);
        monthlyAppointments = [];
    } else {
        monthlyAppointments = data || [];
    }
};

const renderCalendar = async () => {
    await fetchAppointmentsForMonth(currentDate);

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
        const hasAppointments = monthlyAppointments.some(app => app.appointment_date === dateStr);
        const dayClass = hasAppointments ? 'bg-green-100 text-green-700 font-bold' : '';
        const todayClass = new Date().toDateString() === new Date(year, month, day).toDateString() ? 'ring-2 ring-blue-500' : '';
        calendarGrid.innerHTML += `<div data-date="${dateStr}" data-has-appointments="${hasAppointments}" class="day-cell cursor-pointer p-2 rounded-full ${todayClass} ${dayClass}">${day}</div>`;
    }
};

const renderAppointmentsInModal = (date) => {
    const appointmentsOnDay = monthlyAppointments.filter(app => app.appointment_date === date).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    modalDateTitle.textContent = `Citas del ${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    if (appointmentsOnDay.length > 0) {
        modalAppointmentsList.innerHTML = appointmentsOnDay.map(app => `
            <button data-appointment-id="${app.id}" class="appointment-btn w-full text-left bg-white p-3 rounded-lg shadow-sm border hover:bg-gray-50 flex items-center gap-4">
                <img src="${app.pets.image_url || `https://ui-avatars.com/api/?name=${app.pets.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-12 w-12 rounded-full object-cover flex-shrink-0">
                <div>
                    <p class="font-semibold">${app.appointment_time.slice(0, 5)} - ${app.pets.name}</p>
                    <p class="text-sm text-gray-600">Dueño: ${app.profiles.first_name || ''} ${app.profiles.last_name || ''}</p>
                    <p class="text-xs text-gray-500">${app.service}</p>
                </div>
            </button>
        `).join('');
    } else {
        modalAppointmentsList.innerHTML = `<p class="text-center text-gray-500">No hay citas para este día.</p>`;
    }
};

const showAppointmentDetails = async (appointmentId) => {
    // Busca la cita en las citas del mes actual para mayor rapidez
    const appointment = monthlyAppointments.find(app => app.id === appointmentId);
    if (!appointment) return;

    const pet = appointment.pets;
    
    /*
    ================================================================
    CORRECCIÓN: Se modifica la consulta para traer TODAS las citas 
    de la mascota, excepto la actual, sin filtrar por fecha.
    ================================================================
    */
    const { data: petHistory, error } = await supabase
        .from('appointments')
        .select('appointment_date, service, status')
        .eq('pet_id', pet.id) // 1. Trae todas las citas de esta mascota
        .neq('id', appointment.id) // 2. Excluye la cita que estamos viendo actualmente
        .order('appointment_date', { ascending: false }); // 3. Ordena para mostrar las más recientes primero

    if (error) console.error("Error cargando historial completo de la mascota:", error);

    const calculateAge = (birthDate) => {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate);
        const today = new Date();
        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        if (months < 0) { years--; months += 12; }
        return `${years} años y ${months} meses`;
    };
    
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
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Información de la Mascota</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <p><strong>Raza:</strong> ${pet.breed}</p>
                <p><strong>Sexo:</strong> ${pet.sex || 'N/A'}</p>
                <p><strong>Edad:</strong> ${calculateAge(pet.birth_date)}</p>
                <p><strong>Peso:</strong> ${pet.weight ? pet.weight + ' kg' : 'N/A'}</p>
            </div>
            <div class="bg-yellow-50 p-2 rounded-md mt-2">
                <p class="text-xs font-semibold">Observaciones:</p>
                <p class="text-xs">${pet.observations || 'Sin observaciones.'}</p>
            </div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Historial Completo</h4>
            <div class="space-y-2 max-h-40 overflow-y-auto">
                ${petHistory && petHistory.length > 0 ? petHistory.map(hist => `
                    <div class="bg-gray-50 p-2 rounded-md text-sm flex justify-between items-center">
                        <p><strong>${hist.appointment_date}:</strong> ${hist.service}</p>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full 
                            ${hist.status === 'completada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${hist.status}
                        </span>
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
    const [clientsRes, petsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cliente'),
        supabase.from('pets').select('*, profiles(first_name, last_name)'),
    ]);
    allClients = clientsRes.data || [];
    allPets = petsRes.data || [];
    renderClients(allClients);
    renderPets(allPets);
    await renderCalendar();
};

// --- INICIALIZACIÓN Y EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Listeners
    navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    logoutButton.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/public/modules/login/login.html'; });
    clientSearch.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); renderClients(allClients.filter(c => `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term))); });
    petSearch.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); renderPets(allPets.filter(p => p.name.toLowerCase().includes(term) || `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.toLowerCase().includes(term))); });
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
    modalAppointmentsList.addEventListener('click', (e) => {
        const appointmentButton = e.target.closest('.appointment-btn');
        if (appointmentButton) {
            showAppointmentDetails(appointmentButton.dataset.appointmentId);
        }
    });
    modalBackBtn.addEventListener('click', () => {
        modalDetailsView.classList.add('hidden');
        modalDailyView.classList.remove('hidden');
    });

    showView('clients');
    loadInitialData();
});
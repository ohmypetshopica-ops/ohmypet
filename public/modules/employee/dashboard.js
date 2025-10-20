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
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const appointmentsForDay = document.getElementById('appointments-for-day');
const logoutButton = document.getElementById('logout-button');

// --- ESTADO DE LA APLICACIÓN ---
let allClients = [];
let allPets = [];
let allAppointments = [];
let currentDate = new Date();

// --- FUNCIONES DE NAVEGACIÓN ---
const showView = (viewId) => {
    views.forEach(view => {
        view.classList.add('hidden', 'opacity-0', 'transform', '-translate-y-4');
    });

    const activeView = document.getElementById(`${viewId}-view`);
    activeView.classList.remove('hidden');
    setTimeout(() => {
        activeView.classList.remove('opacity-0', 'transform', '-translate-y-4');
    }, 50);

    // Actualizar título y estilos de botones
    navButtons.forEach(btn => {
        if (btn.dataset.view === viewId) {
            btn.classList.remove('text-gray-500');
            btn.classList.add('text-green-600', 'border-t-2', 'border-green-600');
            headerTitle.textContent = btn.querySelector('span').textContent;
        } else {
            btn.classList.remove('text-green-600', 'border-t-2', 'border-green-600');
            btn.classList.add('text-gray-500');
        }
    });
};

// --- RENDERIZADO DE CLIENTES ---
const renderClients = (clients) => {
    if (clients.length === 0) {
        clientsList.innerHTML = `<p class="text-center text-gray-500 mt-8">No se encontraron clientes.</p>`;
        return;
    }
    clientsList.innerHTML = clients.map(client => `
        <div class="bg-white p-4 rounded-lg shadow-sm border">
            <h3 class="font-bold text-gray-800">${client.first_name || ''} ${client.last_name || ''}</h3>
            <p class="text-sm text-gray-600">${client.phone || 'Sin teléfono'}</p>
            <p class="text-sm text-gray-500">${client.email || 'Sin email'}</p>
        </div>
    `).join('');
};

// --- RENDERIZADO DE MASCOTAS ---
const renderPets = (pets) => {
    if (pets.length === 0) {
        petsList.innerHTML = `<p class="text-center text-gray-500 mt-8">No se encontraron mascotas.</p>`;
        return;
    }
    petsList.innerHTML = pets.map(pet => `
        <div class="bg-white p-4 rounded-lg shadow-sm border flex items-center gap-4">
            <img src="${pet.image_url || `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${pet.name.charAt(0)}`}" class="h-12 w-12 rounded-full object-cover">
            <div>
                <h3 class="font-bold text-gray-800">${pet.name}</h3>
                <p class="text-sm text-gray-600">${pet.breed}</p>
                <p class="text-xs text-gray-500">Dueño: ${pet.profiles.first_name || ''} ${pet.profiles.last_name || ''}</p>
            </div>
        </div>
    `).join('');
};

// --- LÓGICA DEL CALENDARIO ---
const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;
    calendarGrid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Días de la semana
    ['D', 'L', 'M', 'M', 'J', 'V', 'S'].forEach(day => {
        calendarGrid.innerHTML += `<div class="font-semibold text-gray-600">${day}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
        calendarGrid.innerHTML += `<div></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const appointmentsOnDay = allAppointments.filter(app => app.appointment_date === dateStr);
        const hasAppointments = appointmentsOnDay.length > 0;
        
        const dayClass = hasAppointments ? 'bg-green-100 text-green-700 font-bold' : '';
        const todayClass = new Date().toDateString() === new Date(year, month, day).toDateString() ? 'bg-blue-500 text-white' : '';

        calendarGrid.innerHTML += `<div data-date="${dateStr}" class="day-cell cursor-pointer p-2 rounded-full ${todayClass} ${dayClass}">${day}</div>`;
    }
    
    document.querySelectorAll('.day-cell').forEach(cell => {
        cell.addEventListener('click', () => renderAppointmentsForDay(cell.dataset.date));
    });
};

const renderAppointmentsForDay = (date) => {
    const appointmentsOnDay = allAppointments.filter(app => app.appointment_date === date);
    if (appointmentsOnDay.length === 0) {
        appointmentsForDay.innerHTML = `<p class="text-center text-gray-500 mt-4">No hay citas para este día.</p>`;
        return;
    }
    appointmentsForDay.innerHTML = appointmentsOnDay.map(app => `
        <div class="bg-gray-50 p-3 rounded-lg mt-2 border-l-4 border-green-500">
            <p class="font-semibold">${app.appointment_time} - ${app.pets.name}</p>
            <p class="text-sm text-gray-600">Dueño: ${app.profiles.first_name || ''} ${app.profiles.last_name || ''}</p>
            <p class="text-xs text-gray-500">${app.service}</p>
        </div>
    `).join('');
};

// --- CARGA INICIAL DE DATOS ---
const loadInitialData = async () => {
    const [clientsRes, petsRes, appointmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cliente'),
        supabase.from('pets').select('*, profiles(first_name, last_name)'),
        supabase.from('appointments').select('*, pets(name), profiles(first_name, last_name)')
    ]);
    
    allClients = clientsRes.data || [];
    allPets = petsRes.data || [];
    allAppointments = appointmentsRes.data || [];

    renderClients(allClients);
    renderPets(allPets);
    renderCalendar();
};

// --- EVENT LISTENERS ---
navButtons.forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
});

clientSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allClients.filter(client => 
        (client.first_name || '').toLowerCase().includes(searchTerm) ||
        (client.last_name || '').toLowerCase().includes(searchTerm)
    );
    renderClients(filtered);
});

petSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allPets.filter(pet => 
        pet.name.toLowerCase().includes(searchTerm) ||
        (pet.profiles.first_name || '').toLowerCase().includes(searchTerm) ||
        (pet.profiles.last_name || '').toLowerCase().includes(searchTerm)
    );
    renderPets(filtered);
});

prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/public/modules/login/login.html';
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    showView('clients');
    loadInitialData();
});
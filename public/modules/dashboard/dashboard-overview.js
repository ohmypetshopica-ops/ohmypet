// public/modules/dashboard/dashboard-overview.js

import { getDashboardStats, getUpcomingAppointments } from './dashboard.api.js';
import { createUpcomingAppointmentItem } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const appointmentsCountElement = document.querySelector('#appointments-count');
const productsCountElement = document.querySelector('#products-count');
const upcomingAppointmentsList = document.querySelector('#upcoming-appointments-list');
const headerTitle = document.querySelector('#header-title');

// --- RENDERIZADO DE DATOS OPTIMIZADO ---
const loadOverviewData = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Dashboard';
    }

    // Hacemos las dos llamadas en paralelo para máxima velocidad
    const [stats, upcomingAppointments] = await Promise.all([
        getDashboardStats(),
        getUpcomingAppointments()
    ]);

    // Actualizamos los contadores con la data de la única llamada RPC
    if (clientCountElement) clientCountElement.textContent = stats.clients;
    if (petCountElement) petCountElement.textContent = stats.pets;
    if (appointmentsCountElement) appointmentsCountElement.textContent = stats.appointments;
    if (productsCountElement) productsCountElement.textContent = stats.products;

    // Actualizamos la lista de próximas citas
    if (upcomingAppointmentsList) {
        upcomingAppointmentsList.innerHTML = upcomingAppointments.length > 0 
            ? upcomingAppointments.map(createUpcomingAppointmentItem).join('') 
            : `<p class="text-sm text-gray-500 text-center py-4">No hay citas programadas.</p>`;
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadOverviewData);
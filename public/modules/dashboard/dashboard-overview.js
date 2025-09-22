// public/modules/dashboard/dashboard-overview.js

import { supabase } from '../../core/supabase.js';
import {
    getClientCount, getPetCount, getAppointmentsCount, getProductsCount, getUpcomingAppointments
} from './dashboard.api.js';
import {
    createUpcomingAppointmentItem
} from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const appointmentsCountElement = document.querySelector('#appointments-count');
const productsCountElement = document.querySelector('#products-count');
const upcomingAppointmentsList = document.querySelector('#upcoming-appointments-list');
const headerTitle = document.querySelector('#header-title');

// --- RENDERIZADO DE DATOS ---
const loadOverviewData = async () => {
    // Verificamos si el elemento existe antes de acceder a su propiedad
    if (headerTitle) {
        headerTitle.textContent = 'Dashboard';
    }

    const [clientCount, petCount, appointmentsCount, productsCount, upcomingAppointments] = await Promise.all([getClientCount(), getPetCount(), getAppointmentsCount(), getProductsCount(), getUpcomingAppointments()]);

    // Validamos cada elemento antes de actualizar su contenido
    if (clientCountElement) {
        clientCountElement.textContent = clientCount;
    }
    if (petCountElement) {
        petCountElement.textContent = petCount;
    }
    if (appointmentsCountElement) {
        appointmentsCountElement.textContent = appointmentsCount;
    }
    if (productsCountElement) {
        productsCountElement.textContent = productsCount;
    }

    if (upcomingAppointmentsList) {
        upcomingAppointmentsList.innerHTML = upcomingAppointments.length > 0 ? upcomingAppointments.map(createUpcomingAppointmentItem).join('') : `<p class="text-sm text-gray-500 text-center py-4">No hay citas programadas.</p>`;
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadOverviewData();
});
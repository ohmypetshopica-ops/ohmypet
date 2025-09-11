// public/modules/dashboard/dashboard.js

import { supabase } from '../../core/supabase.js';
import { getClientCount, getPetCount, getProducts, getServices, getAppointments } from './dashboard.api.js';
import { createProductRow, createServiceRow, createAppointmentRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const productsTableBody = document.querySelector('#products-table-body');
const servicesTableBody = document.querySelector('#services-table-body');
const appointmentsTableBody = document.querySelector('#appointments-table-body');
const logoutButton = document.querySelector('#logout-button');

// --- FUNCIÓN OPTIMIZADA PARA CARGAR Y MOSTRAR DATOS ---
const loadDashboardData = async () => {
    const [
        clientCount,
        petCount,
        products,
        services,
        appointments
    ] = await Promise.all([
        getClientCount(),
        getPetCount(),
        getProducts(),
        getServices(),
        getAppointments()
    ]);

    // --- Rellenar Resumen ---
    clientCountElement.textContent = clientCount;
    petCountElement.textContent = petCount;

    // --- Rellenar Tabla de Productos ---
    if (products && products.length > 0) {
        productsTableBody.innerHTML = products.map(createProductRow).join('');
    } else {
        productsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay productos para mostrar.</td></tr>`;
    }

    // --- Rellenar Tabla de Servicios ---
    if (services && services.length > 0) {
        servicesTableBody.innerHTML = services.map(createServiceRow).join('');
    } else {
        servicesTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay servicios para mostrar.</td></tr>`;
    }

    // --- Rellenar Tabla de Citas ---
    if (appointments && appointments.length > 0) {
        // --- CORRECCIÓN APLICADA AQUÍ ---
        // Ordenamos las citas usando JavaScript por fecha, de la más nueva a la más antigua.
        appointments.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

        const appointmentsHtml = appointments.map(createAppointmentRow).join('');
        appointmentsTableBody.innerHTML = appointmentsHtml;
    } else {
        appointmentsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay citas para mostrar.</td></tr>`;
    }
};

// --- MANEJO DEL LOGOUT ---
logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error al cerrar sesión:', error);
    } else {
        window.location.href = '/public/modules/admin-login/admin-login.html';
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadDashboardData);
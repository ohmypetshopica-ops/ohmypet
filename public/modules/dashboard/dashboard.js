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

// --- FUNCIÓN PARA CARGAR Y MOSTRAR DATOS ---
const loadDashboardData = async () => {
    // Cargar y mostrar conteo de clientes y mascotas
    const clientCount = await getClientCount();
    const petCount = await getPetCount();
    clientCountElement.textContent = clientCount;
    petCountElement.textContent = petCount;

    // Cargar y mostrar productos
    const products = await getProducts();
    if (products.length > 0) {
        products.forEach(product => {
            productsTableBody.innerHTML += createProductRow(product);
        });
    } else {
        productsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay productos para mostrar.</td></tr>`;
    }

    // Cargar y mostrar servicios
    const services = await getServices();
    if (services.length > 0) {
        services.forEach(service => {
            servicesTableBody.innerHTML += createServiceRow(service);
        });
    } else {
        servicesTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay servicios para mostrar.</td></tr>`;
    }

    // Cargar y mostrar citas
    const appointments = await getAppointments();
    if (appointments.length > 0) {
        appointments.forEach(appointment => {
            appointmentsTableBody.innerHTML += createAppointmentRow(appointment);
        });
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
        window.location.href = '/public/modules/login/login.html';
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadDashboardData);

// El código que verifica el rol del usuario se mantiene en auth.js y se ejecuta automáticamente al cargar la página.
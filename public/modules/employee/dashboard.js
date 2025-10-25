// public/modules/employee/dashboard.js
// Archivo principal coordinador del dashboard del empleado

import { supabase } from '../../core/supabase.js';
import { state, updateState } from './employee-state.js';
import { getClientsWithPets } from '../dashboard/dashboard.api.js';

// Importar todos los módulos
import { initClientElements, setupClientListeners, renderClients } from './employee-clients.js';
import { initPetElements, setupPetListeners, renderPets } from './employee-pets.js';
import { initAppointmentElements, setupAppointmentListeners, renderConfirmedAppointments } from './employee-appointments.js';
import { initCalendarElements, setupCalendarListeners, renderCalendar } from './employee-calendar.js';
import { initPOSElements, setupPOSListeners, loadProducts } from './employee-pos.js';
// ---- NUEVA IMPORTACIÓN ----
import { initServiceElements, setupServiceListeners, loadCompletedServicesData, renderCompletedServices } from './employee-services.js';

// Elementos del DOM comunes
const headerTitle = document.getElementById('header-title');
const navButtons = document.querySelectorAll('.nav-btn');
const posHeaderBtn = document.getElementById('pos-view-btn');
const views = document.querySelectorAll('.view-section');
const logoutButton = document.getElementById('logout-button');

// ===========================================
// CARGA DINÁMICA DE HTML
// ===========================================

async function loadHTMLModule(viewId, htmlFile) {
    const viewContainer = document.getElementById(`${viewId}-view`);
    if (!viewContainer) {
        console.error(`No se encontró el contenedor para ${viewId}`);
        return;
    }

    try {
        const response = await fetch(htmlFile);
        if (!response.ok) throw new Error(`Error al cargar ${htmlFile}`);
        const html = await response.text();
        viewContainer.innerHTML = html;
        console.log(`✅ HTML cargado: ${htmlFile}`);
    } catch (error) {
        console.error(`❌ Error al cargar ${htmlFile}:`, error);
        viewContainer.innerHTML = `<p class="text-red-500 text-center">Error al cargar la vista</p>`;
    }
}

// ===========================================
// INICIALIZACIÓN PRINCIPAL
// ===========================================

const initializeDashboard = async () => {
    console.log('🚀 Inicializando dashboard del empleado...');

    await Promise.all([
        loadHTMLModule('clients', 'employee-clients.html'),
        loadHTMLModule('pets', 'employee-pets.html'),
        loadHTMLModule('appointments', 'employee-appointments.html'),
        loadHTMLModule('calendar', 'employee-calendar.html'),
        loadHTMLModule('pos', 'employee-pos.html'),
        loadHTMLModule('services', 'employee-services.html') // ---- CARGAR NUEVO HTML ----
    ]);

    initClientElements();
    initPetElements();
    initAppointmentElements();
    initCalendarElements();
    initPOSElements();
    initServiceElements(); // ---- INICIALIZAR NUEVOS ELEMENTOS ----

    setupClientListeners();
    setupPetListeners();
    setupAppointmentListeners();
    setupCalendarListeners();
    setupPOSListeners();
    setupServiceListeners(); // ---- CONFIGURAR NUEVOS LISTENERS ----

    setupNavigation();

    await loadInitialData();

    switchView('clients');

    console.log('✅ Dashboard del empleado inicializado');
};

// ===========================================
// CARGA DE DATOS INICIALES
// ===========================================

const loadInitialData = async () => {
    try {
        // Cargar clientes y mascotas
        const clientsData = await getClientsWithPets();
        updateState('clientsWithPets', clientsData);

        const allClients = clientsData.map(c => ({
            id: c.id, first_name: c.first_name, last_name: c.last_name, phone: c.phone, email: c.email, district: c.district
        }));
        updateState('allClients', allClients);
        renderClients(allClients);

        const allPets = clientsData.flatMap(client =>
            client.pets ? client.pets.map(pet => ({ ...pet, owner_id: client.id })) : []
        );
        updateState('allPets', allPets);
        renderPets(allPets);

        // Cargar todas las citas (para diferentes vistas)
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*, pets(name, image_url), profiles(first_name, last_name, full_name)') // Añadido full_name
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true });

        updateState('allAppointments', appointments || []);
        renderConfirmedAppointments(); // Renderiza citas pendientes/confirmadas

        // ---- CARGAR DATOS DE SERVICIOS COMPLETADOS ----
        await loadCompletedServicesData();

        // Cargar productos para POS
        await loadProducts();

    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
    }
};

// ===========================================
// NAVEGACIÓN
// ===========================================

const setupNavigation = () => {
    // Navegación inferior
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    // Botón POS en el header
    if (posHeaderBtn) {
        posHeaderBtn.addEventListener('click', () => {
            switchView('pos');
        });
    }

    // Logout
    logoutButton?.addEventListener('click', async () => {
        const confirmed = confirm('¿Estás seguro de que deseas cerrar sesión?');
        if (confirmed) {
            await supabase.auth.signOut();
            window.location.href = '/public/modules/login/login.html';
        }
    });
};

const switchView = (viewName) => {
    // Ocultar todas las vistas
    views.forEach(view => view.classList.add('hidden'));

    // Mostrar la vista seleccionada
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    // Actualizar botones de navegación inferior
    navButtons.forEach(btn => {
        const isActive = btn.dataset.view === viewName;

        if (isActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Actualizar título del header
    const viewTitles = {
        'clients': 'Clientes',
        'pets': 'Mascotas',
        'appointments': 'Citas Pendientes', // Cambiado
        'calendar': 'Calendario',
        'services': 'Servicios Completados', // ---- NUEVO TÍTULO ----
        'pos': 'Punto de Venta'
    };

    headerTitle.textContent = viewTitles[viewName] || 'Dashboard';

    // Renderizar calendario si es necesario
    if (viewName === 'calendar') {
        renderCalendar();
    }
    // ---- Renderizar servicios si es necesario (por si hubo cambios) ----
    if (viewName === 'services') {
        renderCompletedServices(state.completedServices || []);
    }
};

// ===========================================
// PUNTO DE ENTRADA
// ===========================================

document.addEventListener('DOMContentLoaded', initializeDashboard);
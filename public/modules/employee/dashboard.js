// public/modules/employee/dashboard.js
// Archivo principal coordinador del dashboard del empleado

// --- IMPORTANTE: Añadir verificación de autenticación PRIMERO ---
import '../../core/auth-employee.js';
// ---------------------------------------------------------

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
        // Añadimos un timestamp para evitar caché en los HTML también
        const response = await fetch(`${htmlFile}?v=${Date.now()}`);
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
    // La verificación de auth-employee.js ya se ejecutó al inicio del script.
    // Si el usuario no es empleado, ya habrá sido redirigido.

    console.log('🚀 Inicializando dashboard del empleado...');

    await Promise.all([
        loadHTMLModule('clients', 'employee-clients.html'),
        loadHTMLModule('pets', 'employee-pets.html'),
        loadHTMLModule('appointments', 'employee-appointments.html'),
        loadHTMLModule('calendar', 'employee-calendar.html'),
        loadHTMLModule('pos', 'employee-pos.html'),
        loadHTMLModule('services', 'employee-services.html') // ---- CARGAR NUEVO HTML ----
    ]);

    // Esperar un breve momento para asegurar que el DOM se actualice tras cargar los HTML
    await new Promise(resolve => setTimeout(resolve, 50));

    // Inicializar elementos después de cargar HTML
    try {
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

        setupNavigation(); // Configurar navegación después de asegurar que los botones existen

        await loadInitialData(); // Cargar datos después de configurar listeners

        switchView('clients'); // Mostrar vista inicial

        console.log('✅ Dashboard del empleado inicializado');

    } catch(err) {
        console.error("Error durante la inicialización de elementos o listeners:", err);
        // Mostrar un mensaje de error al usuario podría ser útil aquí
    }
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
        // CORRECCIÓN AQUI: Se agregó 'phone' a la selección de profiles
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*, pets(name, image_url), profiles(first_name, last_name, full_name, phone)') 
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
            if (view) { // Asegurarse de que el botón tiene data-view
               switchView(view);
            } else {
                console.warn("Botón de navegación sin atributo data-view:", btn);
            }
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
    } else {
        console.warn(`Vista con ID '${viewName}-view' no encontrada.`);
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
        'appointments': 'Citas Pendientes',
        'calendar': 'Calendario',
        'services': 'Servicios Completados',
        'pos': 'Punto de Venta'
    };

    if (headerTitle) {
      headerTitle.textContent = viewTitles[viewName] || 'Dashboard';
    }


    // Renderizar calendario si es necesario
    if (viewName === 'calendar') {
        // Asegurarse de que la función exista antes de llamarla
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        } else {
            console.warn("Función renderCalendar no encontrada.");
        }
    }
    // Renderizar servicios si es necesario
    if (viewName === 'services') {
        if (typeof renderCompletedServices === 'function') {
           renderCompletedServices(state.completedServices || []);
        } else {
            console.warn("Función renderCompletedServices no encontrada.");
        }
    }
};

// ===========================================
// PUNTO DE ENTRADA
// ===========================================

// Se ejecuta después de que el HTML base (dashboard.html) esté listo,
// pero ANTES de cargar los módulos HTML dinámicos.
document.addEventListener('DOMContentLoaded', () => {
    // La verificación de auth-employee.js ya se ejecutó.
    // Ahora llamamos a initializeDashboard que cargará el resto.
    initializeDashboard();
});
import { getPendingAppointments } from './dashboard.api.js';

// --- DEFINICIÓN DE SECCIONES PARA BÚSQUEDA ---
const dashboardSections = [
    { name: 'Dashboard', url: '/public/modules/dashboard/dashboard-overview.html', keywords: 'inicio, resumen, general' },
    { name: 'Clientes', url: '/public/modules/dashboard/dashboard-clients.html', keywords: 'usuarios, personas' },
    { name: 'Mascotas', url: '/public/modules/dashboard/dashboard-pets.html', keywords: 'perros, animales' },
    { name: 'Citas', url: '/public/modules/dashboard/dashboard-appointments.html', keywords: 'agendar, calendario, turnos' },
    { name: 'Calendario', url: '/public/modules/dashboard/dashboard-calendar.html', keywords: 'agenda, fechas' },
    { name: 'Reclamos', url: '/public/modules/dashboard/dashboard-complaints.html', keywords: 'quejas, libro' },
    { name: 'Reportes', url: '/public/modules/dashboard/dashboard-reports.html', keywords: 'analisis, estadisticas, ingresos' },
    { name: 'Productos', url: '/public/modules/dashboard/dashboard-products.html', keywords: 'inventario, tienda' },
    { name: 'Servicios', url: '/public/modules/dashboard/dashboard-services.html', keywords: 'historial, completados' }
];

// --- LÓGICA DE NOTIFICACIONES ---

const setupNotifications = async () => {
    const button = document.getElementById('notifications-button');
    const countBadge = document.getElementById('notifications-count');
    const dropdown = document.getElementById('notifications-dropdown');
    const list = document.getElementById('notifications-list');
    
    if (!button || !countBadge || !dropdown || !list) return;

    const pendingAppointments = await getPendingAppointments();

    // Actualizar contador
    if (pendingAppointments.length > 0) {
        countBadge.textContent = pendingAppointments.length;
        countBadge.classList.remove('hidden');
    } else {
        countBadge.classList.add('hidden');
    }

    // Llenar lista
    if (pendingAppointments.length > 0) {
        list.innerHTML = pendingAppointments.map(app => {
            const profile = app.profiles;
            const ownerName = (profile?.first_name && profile?.last_name) ? `${profile.first_name} ${profile.last_name}` : profile?.full_name || 'Cliente';
            return `
                <a href="/public/modules/dashboard/dashboard-appointments.html" class="block px-4 py-3 hover:bg-gray-50 border-b">
                    <p class="text-sm font-medium text-gray-800">Cita para: ${app.pets?.name || 'N/A'}</p>
                    <p class="text-xs text-gray-500">${ownerName} - ${app.appointment_date} a las ${app.appointment_time}</p>
                </a>
            `;
        }).join('');
    } else {
        list.innerHTML = '<p class="text-sm text-gray-500 p-4 text-center">No hay citas pendientes.</p>';
    }

    // Manejar visibilidad del dropdown
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
};


// --- LÓGICA DE BÚSQUEDA GLOBAL ---

const setupGlobalSearch = () => {
    const input = document.getElementById('global-search-input');
    const resultsContainer = document.getElementById('global-search-results');

    if (!input || !resultsContainer) return;

    input.addEventListener('input', () => {
        const searchTerm = input.value.toLowerCase();
        if (searchTerm.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }

        const results = dashboardSections.filter(section => 
            section.name.toLowerCase().includes(searchTerm) || 
            section.keywords.toLowerCase().includes(searchTerm)
        );

        if (results.length > 0) {
            resultsContainer.innerHTML = results.map(res => `
                <a href="${res.url}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">${res.name}</a>
            `).join('');
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.classList.add('hidden');
        }
    });
};

// --- INICIALIZACIÓN Y EVENTOS GLOBALES ---

const initializeHeader = () => {
    setupNotifications();
    setupGlobalSearch();

    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', (e) => {
        const notificationsContainer = document.getElementById('notifications-container');
        const searchContainer = document.getElementById('search-container');
        
        if (notificationsContainer && !notificationsContainer.contains(e.target)) {
            document.getElementById('notifications-dropdown')?.classList.add('hidden');
        }
        if (searchContainer && !searchContainer.contains(e.target)) {
            document.getElementById('global-search-results')?.classList.add('hidden');
        }
    });
};

// Exportar la función para que pueda ser llamada desde otros scripts
export { initializeHeader };
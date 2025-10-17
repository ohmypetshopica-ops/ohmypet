import { getPendingAppointments } from './dashboard.api.js';

// --- LÓGICA DE NOTIFICACIONES ---

const setupNotifications = async () => {
    const button = document.getElementById('notifications-button');
    const countBadge = document.getElementById('notifications-count');
    const dropdown = document.getElementById('notifications-dropdown');
    const list = document.getElementById('notifications-list');
    
    if (!button || !countBadge || !dropdown || !list) {
        console.error("No se encontraron los elementos de notificación en el DOM.");
        return;
    }

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


// --- INICIALIZACIÓN Y EVENTOS GLOBALES ---

const initializeHeader = () => {
    setupNotifications();

    // Cerrar menú de notificaciones al hacer clic fuera
    document.addEventListener('click', (e) => {
        const notificationsContainer = document.getElementById('notifications-container');
        
        if (notificationsContainer && !notificationsContainer.contains(e.target)) {
            document.getElementById('notifications-dropdown')?.classList.add('hidden');
        }
    });
};

// Exportar la función para que pueda ser llamada desde otros scripts
export { initializeHeader };